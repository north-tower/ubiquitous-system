import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Conversation } from '../conversation/conversation.entity';
import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';
import {
  matchNumberedOption,
  type NumberedOption,
} from '../enquiry-flow/match-numbered-option';
import { matchHandoverCommand } from '../state-machine/match-handover-command';
import { matchResetCommand } from '../state-machine/match-reset-command';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { isHumanHandoffState } from '../state-machine/human-handoff';
import * as copy from './hmg-copy';
import {
  hmgEntityListMessage,
  hmgBooksHandlingListMessage,
  hmgKraStatusListMessage,
  hmgMeetingListMessage,
  hmgPutThroughListMessage,
  hmgTimingListMessage,
  hmgTopicListMessage,
} from './hmg-interactive';
import {
  HMG_BOOKS_HANDLING_OPTIONS,
  HMG_ENTITY_OPTIONS,
  HMG_KRA_STATUS_OPTIONS,
  HMG_MEETING_OPTIONS,
  HMG_PUT_THROUGH_OPTIONS,
  HMG_SERVICE_OPTIONS,
  HMG_TIMING_OPTIONS,
  hmgServiceNeedsEntityStep,
} from './hmg-options';
import { HmgSession } from './hmg-session.entity';
import { HmgSessionService } from './hmg-session.service';
import type { HmgPayload } from './hmg-payload';
import { HMG_STEPS } from './hmg-steps';
import {
  formatKenyanPhoneDisplay,
  parseKenyanPhone,
} from '../enquiry-flow/parse-kenyan-phone';

export type HmgReply = {
  replyText: string;
  silent?: boolean;
  /** Interactive list (Telnyx, Baileys native list, or Twilio fallback text). */
  baileysList?: BaileysListMessageSpec;
};

@Injectable()
export class HmgFlowService {
  constructor(
    private readonly sessions: HmgSessionService,
    private readonly stateMachine: ConversationStateMachineService,
  ) {}

  async handleInbound(
    conversation: Conversation,
    userText: string | null,
  ): Promise<HmgReply> {
    const text = userText?.trim() ?? '';

    if (matchResetCommand(text)) {
      if (isHumanHandoffState(conversation.currentState)) {
        const resumed = await this.stateMachine.resumeAutomation(
          conversation.id,
          'hmg_consultation',
        );
        conversation.currentState = resumed.currentState;
      }
      await this.sessions.closeOpen(conversation.id);
      return this.openTopicMenu(conversation);
    }

    if (matchHandoverCommand(text)) {
      await this.stateMachine.enterHumanHandoff(conversation.id);
      return {
        replyText:
          'Okay — a consultant can continue here on WhatsApp. Type *reset* when you want the menu again.',
      };
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
      return { replyText: copy.hmgAlreadySubmitted(latest.reference) };
    }

    return this.openTopicMenu(conversation);
  }

  private async openTopicMenu(conversation: Conversation): Promise<HmgReply> {
    await this.sessions.closeOpen(conversation.id);
    await this.sessions.start(conversation.id, HMG_STEPS.AWAITING_TOPIC, {});
    const list = hmgTopicListMessage();
    return {
      replyText: list.text,
      baileysList: list,
    };
  }

  private async continueSession(
    conversation: Conversation,
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    if (session.currentStep === HMG_STEPS.AWAITING_TOPIC) {
      return this.handleTopicStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_ENTITY) {
      return this.handleEntityStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_BUSINESS_NAME) {
      return this.handleBusinessNameStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_KRA_STATUS) {
      return this.handleKraStatusStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_BOOKS_HANDLING) {
      return this.handleBooksHandlingStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_TIMING) {
      return this.handleTimingStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_MEETING) {
      return this.handleMeetingStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_PUT_THROUGH) {
      return this.handlePutThroughStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_BOOKING_NAME) {
      return this.handleBookingNameStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_BOOKING_PHONE) {
      return this.handleBookingPhoneStep(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_BRIEF) {
      return this.handleBriefStep(session, text);
    }
    return this.openTopicMenu(conversation);
  }

  private async handleTopicStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchServiceOption(text);
    if (!matched) {
      const list = hmgTopicListMessage();
      return {
        replyText: copy.hmgTopicReask(),
        baileysList: {
          ...list,
          text: 'Please choose a service from the list below:',
        },
      };
    }

    const payload: HmgPayload = { serviceId: matched.id };
    if (hmgServiceNeedsEntityStep(matched.id)) {
      await this.sessions.save(session, {
        step: HMG_STEPS.AWAITING_ENTITY,
        payload,
      });
      const list = hmgEntityListMessage();
      return {
        replyText: list.text,
        baileysList: list,
      };
    }

    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_BRIEF,
      payload,
    });
    return { replyText: copy.hmgBriefPrompt(matched.id) };
  }

  private async handleEntityStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchNumberedOption(text, HMG_ENTITY_OPTIONS);
    if (!matched) {
      const list = hmgEntityListMessage();
      return {
        replyText: copy.hmgEntityReask(),
        baileysList: {
          ...list,
          text: copy.HMG_ENTITY_PROMPT,
        },
      };
    }

    const serviceId = session.payload.serviceId ?? 'tax_kra';
    const payload: HmgPayload = {
      ...session.payload,
      entityId: matched.id,
    };
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_BUSINESS_NAME,
      payload,
    });
    return { replyText: copy.hmgBusinessNamePrompt(matched.id) };
  }

  private async handleBusinessNameStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const entityId = session.payload.entityId ?? 'limited_company';
    if (text.length < 2) {
      return { replyText: copy.hmgBusinessNameReask(entityId) };
    }

    const payload: HmgPayload = {
      ...session.payload,
      businessName: text,
    };
    const serviceId = session.payload.serviceId ?? 'tax_kra';
    if (serviceId === 'accounting') {
      await this.sessions.save(session, {
        step: HMG_STEPS.AWAITING_BOOKS_HANDLING,
        payload,
      });
      const list = hmgBooksHandlingListMessage();
      return {
        replyText: list.text,
        baileysList: list,
      };
    }

    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_KRA_STATUS,
      payload,
    });
    const list = hmgKraStatusListMessage();
    return {
      replyText: list.text,
      baileysList: list,
    };
  }

  private async handleBooksHandlingStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchNumberedOption(text, HMG_BOOKS_HANDLING_OPTIONS);
    if (!matched) {
      const list = hmgBooksHandlingListMessage();
      return {
        replyText: copy.hmgBooksHandlingReask(),
        baileysList: {
          ...list,
          text: copy.HMG_BOOKS_HANDLING_PROMPT,
        },
      };
    }

    const payload: HmgPayload = {
      ...session.payload,
      booksHandlingId: matched.id,
    };
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_TIMING,
      payload,
    });
    const list = hmgTimingListMessage();
    return {
      replyText: list.text,
      baileysList: list,
    };
  }

  private async handleKraStatusStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchNumberedOption(text, HMG_KRA_STATUS_OPTIONS);
    if (!matched) {
      const list = hmgKraStatusListMessage();
      return {
        replyText: copy.hmgKraStatusReask(),
        baileysList: {
          ...list,
          text: copy.HMG_KRA_STATUS_PROMPT,
        },
      };
    }

    const payload: HmgPayload = {
      ...session.payload,
      kraStatusId: matched.id,
    };
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_TIMING,
      payload,
    });
    const list = hmgTimingListMessage();
    return {
      replyText: list.text,
      baileysList: list,
    };
  }

  private async handleTimingStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchNumberedOption(text, HMG_TIMING_OPTIONS);
    if (!matched) {
      const list = hmgTimingListMessage();
      return {
        replyText: copy.hmgTimingReask(),
        baileysList: {
          ...list,
          text: copy.HMG_TIMING_PROMPT,
        },
      };
    }

    const payload: HmgPayload = {
      ...session.payload,
      timingId: matched.id,
    };
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_MEETING,
      payload,
    });
    const list = hmgMeetingListMessage();
    return {
      replyText: list.text,
      baileysList: list,
    };
  }

  private async handleMeetingStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchNumberedOption(text, HMG_MEETING_OPTIONS);
    if (!matched) {
      const list = hmgMeetingListMessage();
      return {
        replyText: copy.hmgMeetingReask(),
        baileysList: {
          ...list,
          text: copy.HMG_MEETING_PROMPT,
        },
      };
    }

    const payload: HmgPayload = {
      ...session.payload,
      meetingId: matched.id,
    };
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_PUT_THROUGH,
      payload,
    });
    const list = hmgPutThroughListMessage();
    return {
      replyText: list.text,
      baileysList: list,
    };
  }

  private async handlePutThroughStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchNumberedOption(text, HMG_PUT_THROUGH_OPTIONS);
    if (!matched) {
      const list = hmgPutThroughListMessage();
      return {
        replyText: copy.hmgPutThroughReask(),
        baileysList: {
          ...list,
          text: copy.HMG_PUT_THROUGH_PROMPT,
        },
      };
    }

    const payload: HmgPayload = {
      ...session.payload,
      requestId: matched.id,
    };

    if (matched.id === 'book_consultation') {
      await this.sessions.save(session, {
        step: HMG_STEPS.AWAITING_BOOKING_NAME,
        payload,
      });
      return { replyText: copy.HMG_BOOKING_NAME_PROMPT };
    }

    return this.finalizeTaxKraSession(session, payload);
  }

  private async handleBookingNameStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    if (text.length < 2) {
      return { replyText: copy.hmgBookingNameReask() };
    }

    const payload: HmgPayload = {
      ...session.payload,
      contactName: text,
    };
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_BOOKING_PHONE,
      payload,
    });
    return { replyText: copy.HMG_BOOKING_PHONE_PROMPT };
  }

  private async handleBookingPhoneStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const normalized = parseKenyanPhone(text);
    if (!normalized) {
      return { replyText: copy.hmgBookingPhoneReask() };
    }

    const payload: HmgPayload = {
      ...session.payload,
      contactPhone: formatKenyanPhoneDisplay(normalized).replace(/\s/g, ''),
    };
    return this.finalizeTaxKraSession(session, payload);
  }

  private async finalizeTaxKraSession(
    session: HmgSession,
    payload: HmgPayload,
  ): Promise<HmgReply> {
    const reference = createHmgReference();
    await this.sessions.save(session, {
      step: HMG_STEPS.SUBMITTED,
      payload,
    });
    await this.sessions.markSubmitted(session, reference);
    return {
      replyText: copy.hmgTaxKraSubmitted(reference, payload),
    };
  }

  private async handleBriefStep(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const serviceId = session.payload.serviceId ?? 'something_else';
    if (text.length < 4) {
      return { replyText: copy.hmgBriefReask(serviceId) };
    }

    const payload: HmgPayload = { ...session.payload, brief: text };
    const reference = createHmgReference();
    await this.sessions.save(session, {
      step: HMG_STEPS.SUBMITTED,
      payload,
    });
    await this.sessions.markSubmitted(session, reference);
    return {
      replyText: copy.hmgSubmitted(reference, serviceId, text),
    };
  }

}

function matchServiceOption(text: string): NumberedOption | null {
  return matchNumberedOption(text, HMG_SERVICE_OPTIONS);
}

function createHmgReference(): string {
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `HMG-${suffix}`;
}
