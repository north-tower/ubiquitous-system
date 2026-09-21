import { Injectable, Logger } from '@nestjs/common';
import { Conversation } from '../conversation/conversation.entity';
import { DivineBudgetClient } from '../divine-budget/divine-budget.client';
import type { DivineBudgetContact } from '../divine-budget/divine-budget.types';
import { matchHandoverCommand } from '../state-machine/match-handover-command';
import { matchResetCommand } from '../state-machine/match-reset-command';
import * as copy from './enquiry-copy';
import {
  CONFIRM_OPTIONS,
  EVENT_TYPE_OPTIONS,
  RETURNING_OPTIONS,
  SERVICE_OPTIONS,
} from './enquiry-options';
import {
  hasPrefillIdentity,
  identityFromPayload,
  type EnquiryPayload,
} from './enquiry-payload';
import { EnquirySession } from './enquiry-session.entity';
import { EnquirySessionService } from './enquiry-session.service';
import { ENQUIRY_STEPS } from './enquiry-steps';
import {
  looksLikeFailedOptionNumber,
  matchNumberedOption,
  matchNumberedOptions,
} from './match-numbered-option';
import { matchSkipCommand } from './match-skip-command';
import {
  formatIsoDateDisplay,
  parseEventDate,
} from './parse-event-date';
import { parseGuestCount } from './parse-guest-count';
import {
  formatKenyanPhoneDisplay,
  parseKenyanPhone,
} from './parse-kenyan-phone';

type StartOptions = {
  forceNew?: boolean;
  forgetIdentity?: boolean;
};

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
      return this.start(conversation, { forceNew: true });
    }

    if (matchHandoverCommand(text)) {
      return this.handover(conversation);
    }

    const active = await this.sessions.findActive(conversation.id);
    if (active) {
      return this.continueSession(conversation, active, text);
    }

    const latest = await this.sessions.findLatest(conversation.id);
    if (latest?.reference) {
      return { replyText: copy.ALREADY_SUBMITTED(latest.reference) };
    }

    return this.start(conversation);
  }

  private async start(
    conversation: Conversation,
    options: StartOptions = {},
  ): Promise<{ replyText: string }> {
    const seed = await this.seedIdentity(conversation, options);

    if (
      !options.forceNew &&
      (seed.openEnquiryReference || seed.upcomingEventTitle)
    ) {
      await this.sessions.start(
        conversation.id,
        ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE,
        seed,
      );
      return { replyText: copy.returningChoice(seed) };
    }

    await this.sessions.start(
      conversation.id,
      ENQUIRY_STEPS.AWAITING_EVENT_TYPE,
      identityFromPayload(seed),
    );
    return {
      replyText: seed.contactName
        ? copy.welcomeBack(seed.contactName)
        : copy.GREETING,
    };
  }

  private async continueSession(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    switch (session.currentStep) {
      case ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE:
        return this.captureReturningChoice(session, text);
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
      case ENQUIRY_STEPS.AWAITING_BUDGET:
        return this.captureBudget(session, text);
      case ENQUIRY_STEPS.AWAITING_DETAILS:
        return this.captureDetails(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_NAME:
        return this.captureName(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_PHONE:
        return this.capturePhone(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_HANDOVER_NAME:
        return this.captureHandoverName(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_CONFIRM:
        return this.captureConfirm(conversation, session, text);
      default:
        return { replyText: copy.GREETING };
    }
  }

  private async captureReturningChoice(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const matched = matchNumberedOption(text, RETURNING_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_RETURNING };
    }
    if (matched.id === 'wait') {
      return { replyText: copy.RETURNING_WAIT(session.payload) };
    }
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_EVENT_TYPE,
      payload: identityFromPayload(session.payload),
    });
    return {
      replyText: session.payload.contactName
        ? copy.welcomeBack(session.payload.contactName)
        : copy.GREETING,
    };
  }

  private async captureEventType(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const matched = matchNumberedOption(text, EVENT_TYPE_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_EVENT_TYPE };
    }
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_DATE,
      payload: { ...session.payload, eventType: matched.label },
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
    const requestedServices = readServices(text);
    if (!requestedServices) {
      return { replyText: copy.REASK_SERVICES };
    }
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
      step: ENQUIRY_STEPS.AWAITING_BUDGET,
      payload: { ...session.payload, venue },
    });
    return { replyText: copy.ASK_BUDGET };
  }

  private async captureBudget(
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    if (!text && !matchSkipCommand(text)) {
      return { replyText: copy.REASK_BUDGET };
    }
    const budgetRange = matchSkipCommand(text) ? undefined : text;
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_DETAILS,
      payload: { ...session.payload, budgetRange },
    });
    return { replyText: copy.ASK_DETAILS };
  }

  private async captureDetails(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    if (!text && !matchSkipCommand(text)) {
      return { replyText: copy.REASK_DETAILS };
    }
    const additionalDetails = matchSkipCommand(text) ? undefined : text;
    const updated = await this.sessions.save(session, {
      step: session.currentStep,
      payload: { ...session.payload, additionalDetails },
    });
    return this.afterDetails(conversation, updated);
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
    return { replyText: copy.askPhone(whatsappDisplay(conversation)) };
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

  private async captureHandoverName(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<{ replyText: string }> {
    const contactName = text.trim();
    if (!contactName) {
      return { replyText: copy.REASK_NAME };
    }
    const phone = phoneFrom(conversation, session.payload);
    const updated = await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_HANDOVER_NAME,
      payload: {
        ...session.payload,
        contactName,
        wantsCallback: true,
        ...phone,
      },
    });
    return this.submit(conversation, updated);
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
      return this.start(conversation, {
        forceNew: true,
        forgetIdentity: true,
      });
    }
    return this.submit(conversation, session);
  }

  private async afterDetails(
    conversation: Conversation,
    session: EnquirySession,
  ): Promise<{ replyText: string }> {
    if (hasPrefillIdentity(session.payload)) {
      const updated = await this.sessions.save(session, {
        step: ENQUIRY_STEPS.AWAITING_CONFIRM,
        payload: session.payload,
      });
      return { replyText: copy.confirmationPlayback(updated.payload) };
    }
    if (session.payload.contactName) {
      await this.sessions.save(session, {
        step: ENQUIRY_STEPS.AWAITING_PHONE,
        payload: session.payload,
      });
      return { replyText: copy.askPhone(whatsappDisplay(conversation)) };
    }
    await this.sessions.save(session, {
      step: ENQUIRY_STEPS.AWAITING_NAME,
      payload: session.payload,
    });
    return { replyText: copy.ASK_NAME };
  }

  private async handover(
    conversation: Conversation,
  ): Promise<{ replyText: string }> {
    const active = await this.sessions.findActive(conversation.id);
    const latest = await this.sessions.findLatest(conversation.id);
    if (!active && latest?.reference) {
      return { replyText: copy.ALREADY_SUBMITTED(latest.reference) };
    }

    const session =
      active ??
      (await this.sessions.start(
        conversation.id,
        ENQUIRY_STEPS.AWAITING_HANDOVER_NAME,
        {
          ...identityFromPayload(latest?.payload),
          wantsCallback: true,
        },
      ));

    const named = await this.sessions.save(session, {
      step: session.currentStep,
      payload: { ...session.payload, wantsCallback: true },
    });

    if (named.payload.contactName) {
      const withPhone = await this.sessions.save(named, {
        step: named.currentStep,
        payload: {
          ...named.payload,
          ...phoneFrom(conversation, named.payload),
        },
      });
      return this.submit(conversation, withPhone);
    }

    await this.sessions.save(named, {
      step: ENQUIRY_STEPS.AWAITING_HANDOVER_NAME,
      payload: named.payload,
    });
    return { replyText: copy.ASK_HANDOVER_NAME };
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
        notes: session.payload.additionalDetails,
        budgetRange: session.payload.budgetRange,
        wantsCallback: Boolean(session.payload.wantsCallback),
        idempotencyKey: session.id,
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

  private async seedIdentity(
    conversation: Conversation,
    options: StartOptions,
  ): Promise<EnquiryPayload> {
    const latest = options.forgetIdentity
      ? null
      : await this.sessions.findLatest(conversation.id);
    const fromSession = identityFromPayload(latest?.payload);
    const whatsapp = parseKenyanPhone(conversation.prospectPhone);
    const lookup = options.forceNew
      ? null
      : await this.lookupQuietly(whatsapp);

    const contactName =
      fromSession.contactName ??
      (lookup?.known ? (lookup.contactName ?? undefined) : undefined);
    const contactPhoneNormalized =
      fromSession.contactPhoneNormalized ?? whatsapp ?? undefined;
    const contactPhone =
      fromSession.contactPhone ??
      (contactPhoneNormalized
        ? formatKenyanPhoneDisplay(contactPhoneNormalized)
        : undefined);

    const openEnquiry =
      lookup?.known && !options.forceNew ? lookup.openEnquiry : null;
    const upcomingEvent =
      lookup?.known && !options.forceNew ? lookup.upcomingEvent : null;

    return {
      contactName,
      contactPhone,
      contactPhoneNormalized,
      openEnquiryReference: openEnquiry?.reference,
      upcomingEventTitle: upcomingEvent?.title,
      upcomingEventDateDisplay: upcomingEvent?.eventDate
        ? formatIsoDateDisplay(upcomingEvent.eventDate)
        : undefined,
      upcomingEventStatus: upcomingEvent?.status,
    };
  }

  private async lookupQuietly(
    phone: string | null,
  ): Promise<DivineBudgetContact | null> {
    if (!phone || !this.divineBudget.isConfigured()) {
      return null;
    }
    try {
      return await this.divineBudget.lookupContact(phone);
    } catch (error) {
      this.logger.warn(
        `Contact lookup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}

function readServices(text: string): string | null {
  const matched = matchNumberedOptions(text, SERVICE_OPTIONS);
  if (matched && matched.length > 0) {
    return matched.map((row) => row.label).join(', ');
  }
  const trimmed = text.trim();
  if (!trimmed || looksLikeFailedOptionNumber(trimmed)) {
    return null;
  }
  return trimmed;
}

function whatsappDisplay(conversation: Conversation): string {
  const whatsapp = parseKenyanPhone(conversation.prospectPhone);
  return whatsapp
    ? formatKenyanPhoneDisplay(whatsapp)
    : "the number you're on";
}

function phoneFrom(
  conversation: Conversation,
  payload: EnquiryPayload,
): Pick<EnquiryPayload, 'contactPhone' | 'contactPhoneNormalized'> {
  const normalized =
    payload.contactPhoneNormalized ??
    parseKenyanPhone(conversation.prospectPhone) ??
    undefined;
  if (!normalized) {
    return {};
  }
  return {
    contactPhoneNormalized: normalized,
    contactPhone: formatKenyanPhoneDisplay(normalized),
  };
}
