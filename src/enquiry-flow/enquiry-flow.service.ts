import { Injectable, Logger } from '@nestjs/common';
import { Conversation } from '../conversation/conversation.entity';
import { DivineBudgetClient } from '../divine-budget/divine-budget.client';
import { matchResetCommand } from '../state-machine/match-reset-command';
import * as copy from './enquiry-copy';
import {
  CONFIRM_OPTIONS,
  EVENT_TYPE_OPTIONS,
  INTENT_OPTIONS,
  SERVICE_OPTIONS,
} from './enquiry-options';
import { EnquirySession } from './enquiry-session.entity';
import { EnquirySessionService } from './enquiry-session.service';
import { ENQUIRY_STEPS } from './enquiry-steps';
import { matchNumberedOption } from './match-numbered-option';
import { parseEventDate } from './parse-event-date';
import { parseGuestCount } from './parse-guest-count';
import {
  formatKenyanPhoneDisplay,
  parseKenyanPhone,
} from './parse-kenyan-phone';

@Injectable()
export class EnquiryFlowService {
  private readonly logger = new Logger(EnquiryFlowService.name);

  constructor(
    private readonly sessions: EnquirySessionService,
    private readonly divineBudget: DivineBudgetClient,
  ) {}

  async handleInbound(
    conversation: Conversation,
    userText: string | null,
  ): Promise<{ replyText: string }> {
    const text = userText?.trim() ?? '';

    if (matchResetCommand(text)) {
      await this.sessions.closeOpen(conversation.id);
      return this.start(conversation);
    }

    const active = await this.sessions.findActive(conversation.id);
    if (active) {
      return this.continueSession(conversation, active, text);
    }

    const latest = await this.sessions.findLatest(conversation.id);
    if (latest?.submittedAt) {
      return { replyText: copy.ALREADY_SUBMITTED(latest.reference) };
    }

    return this.start(conversation);
  }

  private async start(
    conversation: Conversation,
  ): Promise<{ replyText: string }> {
    await this.sessions.start(
      conversation.id,
      ENQUIRY_STEPS.AWAITING_EVENT_TYPE,
    );
    return { replyText: copy.GREETING };
  }

  private async continueSession(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    switch (session.currentStep) {
      case ENQUIRY_STEPS.AWAITING_EVENT_TYPE:
        return this.captureEventType(session, text);
      case ENQUIRY_STEPS.AWAITING_DATE:
        return this.captureDate(session, text);
      case ENQUIRY_STEPS.AWAITING_SERVICES:
        return this.captureServices(session, text);
      case ENQUIRY_STEPS.AWAITING_GUESTS:
        return this.captureGuests(session, text);
      case ENQUIRY_STEPS.AWAITING_VENUE:
        return this.captureVenue(session, text);
      case ENQUIRY_STEPS.AWAITING_INTENT:
        return this.captureIntent(session, text);
      case ENQUIRY_STEPS.AWAITING_NAME:
        return this.captureName(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_PHONE:
        return this.capturePhone(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_CONFIRM:
        return this.captureConfirm(conversation, session, text);
      default:
        return { replyText: copy.GREETING };
    }
  }

  private async captureEventType(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const matched = matchNumberedOption(text, EVENT_TYPE_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_EVENT_TYPE };
    }
    const eventType = matched.label;
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_DATE,
      payload: { ...session.payload, eventType },
    });
    return { replyText: copy.ASK_DATE };
  }

  private async captureDate(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const parsed = parseEventDate(text);
    if (!parsed) {
      return { replyText: copy.REASK_DATE };
    }
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_SERVICES,
      payload: {
        ...session.payload,
        eventDate: parsed.iso,
        eventDateDisplay: parsed.display,
      },
    });
    return { replyText: copy.ASK_SERVICES };
  }

  private async captureServices(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const matched = matchNumberedOption(text, SERVICE_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_SERVICES };
    }
    const requestedServices = matched.label;
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_GUESTS,
      payload: { ...session.payload, requestedServices },
    });
    return { replyText: copy.ASK_GUESTS };
  }

  private async captureGuests(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const parsed = parseGuestCount(text);
    if (!parsed) {
      return { replyText: copy.REASK_GUESTS };
    }
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_VENUE,
      payload: {
        ...session.payload,
        guestEstimate: parsed.estimate,
        guestEstimateRaw: parsed.raw,
      },
    });
    return { replyText: copy.ASK_VENUE };
  }

  private async captureVenue(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const venue = text.trim();
    if (!venue) {
      return { replyText: copy.REASK_VENUE };
    }
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_INTENT,
      payload: { ...session.payload, venue },
    });
    return { replyText: copy.ASK_INTENT };
  }

  private async captureIntent(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const matched = matchNumberedOption(text, INTENT_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_INTENT };
    }
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_NAME,
      payload: {
        ...session.payload,
        wantsCallback: matched.id === 'callback',
      },
    });
    return { replyText: copy.ASK_NAME };
  }

  private async captureName(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const contactName = text.trim();
    if (!contactName) {
      return { replyText: copy.REASK_NAME };
    }
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_PHONE,
      payload: { ...session.payload, contactName },
    });
    const whatsapp = parseKenyanPhone(conversation.prospectPhone);
    const display = whatsapp
      ? formatKenyanPhoneDisplay(whatsapp)
      : "the number you're on";
    return { replyText: copy.askPhone(display) };
  }

  private async capturePhone(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const fromWhatsapp = parseKenyanPhone(conversation.prospectPhone);
    const choseWhatsapp = /^\s*1\s*[.)]?\s*$/.test(text);
    const normalized = choseWhatsapp ? fromWhatsapp : parseKenyanPhone(text);

    if (!normalized) {
      return { replyText: copy.REASK_PHONE };
    }

    const updated = await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_CONFIRM,
      payload: {
        ...session.payload,
        contactPhone: formatKenyanPhoneDisplay(normalized),
        contactPhoneNormalized: normalized,
      },
    });
    return { replyText: copy.confirmationPlayback(updated.payload) };
  }

  private async captureConfirm(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const matched = matchNumberedOption(text, CONFIRM_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_CONFIRM };
    }
    if (matched.id === 'restart') {
      await this.sessions.closeOpen(conversation.id);
      return this.start(conversation);
    }
    return this.submit(conversation, session);
  }

  private async submit(
    conversation: Conversation,
    session: EnquirySession,
  ): Promise<{ replyText: string }> {
    if (!this.divineBudget.isConfigured()) {
      this.logger.error(
        `Divine Budget client is not configured conversation=${conversation.id}`,
      );
      return { replyText: copy.NOT_CONFIGURED };
    }

    const whatsappPhone = parseKenyanPhone(conversation.prospectPhone);
    if (!whatsappPhone || !session.payload.contactName) {
      return { replyText: copy.REASK_PHONE };
    }

    try {
      const result = await this.divineBudget.submitEnquiry({
        contactName: session.payload.contactName,
        contactPhone:
          session.payload.contactPhoneNormalized ??
          session.payload.contactPhone ??
          whatsappPhone,
        whatsappPhone,
        eventType: session.payload.eventType,
        eventDate: session.payload.eventDate,
        venue: session.payload.venue,
        guestEstimate: session.payload.guestEstimate,
        guestEstimateRaw: session.payload.guestEstimateRaw,
        requestedServices: session.payload.requestedServices,
        wantsCallback: Boolean(session.payload.wantsCallback),
        idempotencyKey: conversation.id,
      });
      await this.sessions.markSubmitted(session, result.reference);
      return {
        replyText: copy.submittedReply(session.payload, result.reference),
      };
    } catch (error) {
      this.logger.error(
        `Enquiry submit failed conversation=${conversation.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { replyText: copy.SUBMIT_FAILED };
    }
  }
}
