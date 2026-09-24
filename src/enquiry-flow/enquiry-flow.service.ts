import { Injectable, Logger } from '@nestjs/common';
import { Conversation } from '../conversation/conversation.entity';
import { DivineBudgetClient } from '../divine-budget/divine-budget.client';
import type { DivineBudgetContact } from '../divine-budget/divine-budget.types';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { isHumanHandoffState } from '../state-machine/human-handoff';
import { matchHandoverCommand } from '../state-machine/match-handover-command';
import { matchResetCommand } from '../state-machine/match-reset-command';
import * as copy from './enquiry-copy';
import {
  BUDGET_CONFIRM_OPTIONS,
  BUDGET_OPTIONS,
  CONFIRM_OPTIONS,
  EDIT_FIELD_OPTIONS,
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
import { isLikelyPersonName } from './is-person-name';
import {
  looksLikeFailedOptionNumber,
  matchNumberedOption,
  matchNumberedOptions,
} from './match-numbered-option';
import { matchSkipCommand } from './match-skip-command';
import { matchStatusCommand } from './match-status-command';
import { BUDGET_BAND_AMOUNTS, budgetLooksLow, parseBudget } from './parse-budget';
import {
  formatIsoDateDisplay,
  parseEventDate,
} from './parse-event-date';
import { parseGuestCount } from './parse-guest-count';
import {
  formatKenyanPhoneDisplay,
  parseKenyanPhone,
} from './parse-kenyan-phone';
import { combineVenue, parseVenue } from './parse-venue';

type StartOptions = {
  forceNew?: boolean;
  forgetIdentity?: boolean;
};

export type EnquiryReply = {
  replyText: string;
  list?: 'event_type';
  silent?: boolean;
};

@Injectable()
export class EnquiryFlowService {
  private readonly logger = new Logger(EnquiryFlowService.name);

  constructor(
    private readonly sessions: EnquirySessionService,
    private readonly divineBudget: DivineBudgetClient,
    private readonly stateMachine: ConversationStateMachineService,
  ) {}

  async handleInbound(
    conversation: Conversation,
    userText: string | null,
  ): Promise<EnquiryReply> {
    const text = userText?.trim() ?? '';

    if (matchResetCommand(text)) {
      if (isHumanHandoffState(conversation.currentState)) {
        const resumed = await this.stateMachine.resumeAutomation(
          conversation.id,
          'enquiry_intake',
        );
        conversation.currentState = resumed.currentState;
      }
      await this.sessions.closeOpen(conversation.id);
      return this.start(conversation, { forceNew: true });
    }

    if (matchHandoverCommand(text)) {
      return this.handover(conversation);
    }

    if (matchStatusCommand(text)) {
      return this.reportStatus(conversation);
    }

    if (isHumanHandoffState(conversation.currentState)) {
      return { replyText: '', silent: true };
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
  ): Promise<EnquiryReply> {
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
    return eventTypeListReply(
      seed.contactName ? copy.welcomeBack(seed.contactName) : copy.GREETING,
    );
  }

  private async continueSession(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
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
      case ENQUIRY_STEPS.AWAITING_VENUE_SITE:
        return this.captureVenueSite(session, text);
      case ENQUIRY_STEPS.AWAITING_BUDGET:
        return this.captureBudget(session, text);
      case ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM:
        return this.captureBudgetConfirm(session, text);
      case ENQUIRY_STEPS.AWAITING_DETAILS:
        return this.captureDetails(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_NAME:
        return this.captureName(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_PHONE:
        return this.capturePhone(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_HANDOVER_NAME:
        return this.captureHandoverName(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_EDIT_FIELD:
        return this.captureEditField(conversation, session, text);
      case ENQUIRY_STEPS.AWAITING_CONFIRM:
        return this.captureConfirm(conversation, session, text);
      default:
        return eventTypeListReply(copy.GREETING);
    }
  }

  private async captureReturningChoice(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
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
    return eventTypeListReply(
      session.payload.contactName
        ? copy.welcomeBack(session.payload.contactName)
        : copy.GREETING,
    );
  }

  private async captureEventType(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const matched = matchNumberedOption(text, EVENT_TYPE_OPTIONS);
    if (!matched) {
      return eventTypeListReply(copy.REASK_EVENT_TYPE);
    }
    return this.afterField(session, { eventType: matched.label }, {
      step: ENQUIRY_STEPS.AWAITING_DATE,
      replyText: copy.ASK_DATE,
    });
  }

  private async captureDate(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const parsed = parseEventDate(text);
    if (!parsed) {
      return { replyText: copy.REASK_DATE };
    }
    return this.afterField(
      session,
      { eventDate: parsed.iso, eventDateDisplay: parsed.display },
      { step: ENQUIRY_STEPS.AWAITING_SERVICES, replyText: copy.ASK_SERVICES },
    );
  }

  private async captureServices(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const requestedServices = readServices(text);
    if (!requestedServices) {
      return { replyText: copy.REASK_SERVICES };
    }
    return this.afterField(session, { requestedServices }, {
      step: ENQUIRY_STEPS.AWAITING_GUESTS,
      replyText: copy.ASK_GUESTS,
    });
  }

  private async captureGuests(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const parsed = parseGuestCount(text);
    if (!parsed) {
      return { replyText: copy.REASK_GUESTS };
    }
    return this.afterField(
      session,
      { guestEstimate: parsed.estimate, guestEstimateRaw: parsed.raw },
      { step: ENQUIRY_STEPS.AWAITING_VENUE, replyText: copy.ASK_VENUE },
    );
  }

  private async captureVenue(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const parsed = parseVenue(text);
    if (!parsed) {
      return { replyText: copy.REASK_VENUE };
    }
    if (parsed.needsSite) {
      const payload = {
        ...session.payload,
        venue: parsed.display,
        venueTown: parsed.town,
        venueSite: undefined,
      };
      await this.sessions.save(session, {
        step: ENQUIRY_STEPS.AWAITING_VENUE_SITE,
        payload,
      });
      return { replyText: copy.ASK_VENUE_SITE };
    }
    return this.afterField(
      session,
      {
        venue: parsed.display,
        venueTown: parsed.town,
        venueSite: parsed.site,
      },
      { step: ENQUIRY_STEPS.AWAITING_BUDGET, replyText: copy.ASK_BUDGET },
    );
  }

  private async captureVenueSite(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const town = session.payload.venueTown ?? session.payload.venue ?? '';
    const site = matchSkipCommand(text) ? undefined : text.trim();
    if (!site && !matchSkipCommand(text)) {
      return { replyText: copy.REASK_VENUE_SITE };
    }
    if (site && site.length < 2) {
      return { replyText: copy.REASK_VENUE_SITE };
    }
    const parsedSite = site ? parseVenue(site) : null;
    const siteName = parsedSite?.site ?? parsedSite?.display ?? site;
    return this.afterField(
      session,
      {
        venueTown: town,
        venueSite: siteName,
        venue: combineVenue(town, siteName),
      },
      { step: ENQUIRY_STEPS.AWAITING_BUDGET, replyText: copy.ASK_BUDGET },
    );
  }

  private async captureBudget(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const band = matchNumberedOption(text, BUDGET_OPTIONS);
    const skipped = matchSkipCommand(text) || band?.id === 'unsure';
    if (skipped) {
      return this.afterField(
        session,
        {
          budgetRange: undefined,
          budgetAmountKes: undefined,
          budgetLooksLow: undefined,
        },
        { step: ENQUIRY_STEPS.AWAITING_DETAILS, replyText: copy.ASK_DETAILS },
      );
    }

    const parsed = band
      ? {
          display: band.label,
          amountKes: BUDGET_BAND_AMOUNTS[band.id] ?? null,
        }
      : parseBudget(text);
    if (!parsed) {
      return { replyText: copy.REASK_BUDGET };
    }

    const looksLow = budgetLooksLow({
      amountKes: parsed.amountKes,
      guests: session.payload.guestEstimate,
      services: session.payload.requestedServices,
    });
    const budgetPayload = {
      budgetRange: parsed.display,
      budgetAmountKes: parsed.amountKes ?? undefined,
      budgetLooksLow: looksLow || undefined,
    };
    if (looksLow) {
      await this.sessions.save(session, {
        step: ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM,
        payload: { ...session.payload, ...budgetPayload },
      });
      return { replyText: copy.askBudgetLow(parsed.display) };
    }
    return this.afterField(session, budgetPayload, {
      step: ENQUIRY_STEPS.AWAITING_DETAILS,
      replyText: copy.ASK_DETAILS,
    });
  }

  private async captureBudgetConfirm(
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const matched = matchNumberedOption(text, BUDGET_CONFIRM_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_BUDGET_CONFIRM };
    }
    if (matched.id === 'adjust') {
      await this.sessions.save(session, {
        step: ENQUIRY_STEPS.AWAITING_BUDGET,
        payload: {
          ...session.payload,
          budgetRange: undefined,
          budgetAmountKes: undefined,
          budgetLooksLow: undefined,
        },
      });
      return { replyText: copy.ASK_BUDGET };
    }
    return this.afterField(session, { budgetLooksLow: true }, {
      step: ENQUIRY_STEPS.AWAITING_DETAILS,
      replyText: copy.ASK_DETAILS,
    });
  }

  private async captureDetails(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    if (!text && !matchSkipCommand(text)) {
      return { replyText: copy.REASK_DETAILS };
    }
    const additionalDetails = matchSkipCommand(text) ? undefined : text;
    if (session.payload.returnToConfirm) {
      return this.afterField(session, { additionalDetails }, {
        step: ENQUIRY_STEPS.AWAITING_CONFIRM,
        replyText: copy.confirmationPlayback({
          ...session.payload,
          additionalDetails,
        }),
      });
    }
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
  ): Promise<EnquiryReply> {
    const contactName = text.trim();
    if (!isLikelyPersonName(contactName)) {
      return { replyText: copy.REASK_NAME };
    }
    if (session.payload.returnToConfirm) {
      return this.afterField(session, { contactName }, {
        step: ENQUIRY_STEPS.AWAITING_CONFIRM,
        replyText: copy.confirmationPlayback({
          ...session.payload,
          contactName,
        }),
      });
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
  ): Promise<EnquiryReply> {
    const fromWhatsapp = parseKenyanPhone(conversation.prospectPhone);
    const choseWhatsapp = /^\s*1\s*[.)]?\s*$/.test(text);
    const normalized = choseWhatsapp ? fromWhatsapp : parseKenyanPhone(text);

    if (!normalized) {
      return { replyText: copy.REASK_PHONE };
    }

    return this.afterField(
      session,
      {
        contactPhone: formatKenyanPhoneDisplay(normalized),
        contactPhoneNormalized: normalized,
      },
      {
        step: ENQUIRY_STEPS.AWAITING_CONFIRM,
        replyText: copy.confirmationPlayback({
          ...session.payload,
          contactPhone: formatKenyanPhoneDisplay(normalized),
          contactPhoneNormalized: normalized,
        }),
      },
    );
  }

  private async captureHandoverName(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const contactName = text.trim();
    if (!isLikelyPersonName(contactName)) {
      return { replyText: copy.REASK_NAME };
    }
    const phone = phoneFrom(conversation, session.payload);
    const updated = await this.sessions.save(session, {
      step: session.currentStep,
      payload: {
        ...session.payload,
        contactName,
        wantsCallback: true,
        ...phone,
      },
    });
    return this.submit(conversation, updated);
  }

  private async captureEditField(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const matched = matchNumberedOption(text, EDIT_FIELD_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_EDIT_FIELD };
    }
    const next = editTarget(matched.id, conversation);
    if (!next) {
      return { replyText: copy.REASK_EDIT_FIELD };
    }
    await this.sessions.save(session, {
      step: next.step,
      payload: { ...session.payload, returnToConfirm: true },
    });
    return { replyText: next.replyText, list: next.list };
  }

  private async captureConfirm(
    conversation: Conversation,
    session: EnquirySession,
    text: string,
  ): Promise<EnquiryReply> {
    const matched = matchNumberedOption(text, CONFIRM_OPTIONS);
    if (!matched) {
      return { replyText: copy.REASK_CONFIRM };
    }
    if (matched.id === 'edit') {
      await this.sessions.save(session, {
        step: ENQUIRY_STEPS.AWAITING_EDIT_FIELD,
        payload: { ...session.payload, returnToConfirm: true },
      });
      return { replyText: copy.ASK_EDIT_FIELD };
    }
    return this.submit(conversation, session);
  }

  private async afterDetails(
    conversation: Conversation,
    session: EnquirySession,
  ): Promise<EnquiryReply> {
    if (hasPrefillIdentity(session.payload)) {
      const updated = await this.sessions.save(session, {
        step: ENQUIRY_STEPS.AWAITING_CONFIRM,
        payload: session.payload,
      });
      return { replyText: copy.confirmationPlayback(updated.payload) };
    }
    if (isLikelyPersonName(session.payload.contactName)) {
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

  private async afterField(
    session: EnquirySession,
    patch: EnquiryPayload,
    sequential: { step: string; replyText: string },
  ): Promise<EnquiryReply> {
    const editing = session.payload.returnToConfirm === true;
    const payload: EnquiryPayload = {
      ...session.payload,
      ...patch,
    };
    if (editing) {
      delete payload.returnToConfirm;
    }
    const step = editing ? ENQUIRY_STEPS.AWAITING_CONFIRM : sequential.step;
    const updated = await this.sessions.save(session, { step, payload });
    return {
      replyText: editing
        ? copy.confirmationPlayback(updated.payload)
        : sequential.replyText,
    };
  }

  private async handover(
    conversation: Conversation,
  ): Promise<EnquiryReply> {
    const active = await this.sessions.findActive(conversation.id);
    const latest = await this.sessions.findLatest(conversation.id);
    if (!active && latest?.reference) {
      const handedOff = await this.stateMachine.enterHumanHandoff(
        conversation.id,
      );
      conversation.currentState = handedOff.currentState;
      return { replyText: '', silent: true };
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

    if (isLikelyPersonName(named.payload.contactName)) {
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
  ): Promise<EnquiryReply> {
    if (!this.divineBudget.isConfigured()) {
      this.logger.error(
        `Divine Budget client is not configured conversation=${conversation.id}`,
      );
      return { replyText: copy.NOT_CONFIGURED };
    }

    const whatsappPhone = parseKenyanPhone(conversation.prospectPhone);
    if (!whatsappPhone || !isLikelyPersonName(session.payload.contactName)) {
      return { replyText: copy.REASK_NAME };
    }

    const notes = [
      session.payload.additionalDetails,
      session.payload.budgetLooksLow ? copy.STAFF_BUDGET_FLAG : undefined,
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const result = await this.divineBudget.submitEnquiry({
        contactName: session.payload.contactName as string,
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
        notes: notes || undefined,
        budgetRange: session.payload.budgetRange,
        wantsCallback: Boolean(session.payload.wantsCallback),
        idempotencyKey: session.id,
      });
      await this.sessions.markSubmitted(session, result.reference);
      const handedOff = await this.stateMachine.enterHumanHandoff(
        conversation.id,
      );
      conversation.currentState = handedOff.currentState;
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

  private async reportStatus(
    conversation: Conversation,
  ): Promise<EnquiryReply> {
    const active = await this.sessions.findActive(conversation.id);
    if (active && !active.reference) {
      return {
        replyText: copy.statusReply({
          reference: null,
          status: null,
          inProgress: true,
        }),
      };
    }

    const latest = await this.sessions.findLatest(conversation.id);
    const whatsapp = parseKenyanPhone(conversation.prospectPhone);
    const lookup = await this.lookupQuietly(whatsapp);
    const open = lookup?.known ? lookup.openEnquiry : null;

    return {
      replyText: copy.statusReply({
        reference: open?.reference ?? latest?.reference ?? null,
        status: open?.status ?? null,
        inProgress: false,
      }),
    };
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

    const lookedUpName =
      lookup?.known && isLikelyPersonName(lookup.contactName)
        ? (lookup.contactName ?? undefined)
        : undefined;
    const contactName = fromSession.contactName ?? lookedUpName;
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

function eventTypeListReply(replyText: string): EnquiryReply {
  return { replyText, list: 'event_type' };
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

function editTarget(
  fieldId: string,
  conversation: Conversation,
): { step: string; replyText: string; list?: 'event_type' } | null {
  switch (fieldId) {
    case 'eventType':
      return {
        step: ENQUIRY_STEPS.AWAITING_EVENT_TYPE,
        replyText: copy.ASK_EVENT_TYPE,
        list: 'event_type',
      };
    case 'date':
      return { step: ENQUIRY_STEPS.AWAITING_DATE, replyText: copy.ASK_DATE };
    case 'services':
      return {
        step: ENQUIRY_STEPS.AWAITING_SERVICES,
        replyText: copy.ASK_SERVICES,
      };
    case 'guests':
      return {
        step: ENQUIRY_STEPS.AWAITING_GUESTS,
        replyText: copy.ASK_GUESTS,
      };
    case 'venue':
      return { step: ENQUIRY_STEPS.AWAITING_VENUE, replyText: copy.ASK_VENUE };
    case 'budget':
      return {
        step: ENQUIRY_STEPS.AWAITING_BUDGET,
        replyText: copy.ASK_BUDGET,
      };
    case 'details':
      return {
        step: ENQUIRY_STEPS.AWAITING_DETAILS,
        replyText: copy.ASK_DETAILS,
      };
    case 'name':
      return { step: ENQUIRY_STEPS.AWAITING_NAME, replyText: copy.ASK_NAME };
    case 'phone':
      return {
        step: ENQUIRY_STEPS.AWAITING_PHONE,
        replyText: copy.askPhone(whatsappDisplay(conversation)),
      };
    default:
      return null;
  }
}
