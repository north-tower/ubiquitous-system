import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Conversation } from '../conversation/conversation.entity';
import type { WhatsappReplyButtons } from '../outbound/whatsapp-reply-buttons';
import { isHumanHandoffState } from '../state-machine/human-handoff';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import * as copy from './hmg-copy';
import {
  hmgAuditButtons,
  hmgBooksButtons,
  hmgMeetingButtons,
  hmgMenuButtons,
  hmgTaxButtons,
} from './hmg-interactive';
import {
  HMG_AUDIT_CHOICES,
  HMG_BOOKS_CHOICES,
  HMG_MEETING_CHOICES,
  HMG_TAX_CHOICES,
  matchHmgChoice,
  matchHmgMenu,
  type HmgChoice,
  type HmgMenuId,
  type HmgServiceId,
} from './hmg-options';
import type { HmgPayload } from './hmg-payload';
import { isHmgRestart } from './hmg-restart';
import { HmgSession } from './hmg-session.entity';
import { HmgSessionService } from './hmg-session.service';
import { HMG_STEPS, type HmgStep } from './hmg-steps';

export type HmgReply = {
  replyText: string;
  silent?: boolean;
  /** Up to 3 WhatsApp reply buttons. The text is the numbered fallback. */
  replyButtons?: WhatsappReplyButtons;
};

const MENU_STEP: Record<HmgMenuId, HmgStep> = {
  tax: HMG_STEPS.AWAITING_TAX,
  books: HMG_STEPS.AWAITING_BOOKS,
  audit_other: HMG_STEPS.AWAITING_AUDIT,
};

const MENU_BUTTONS: Record<HmgMenuId, () => WhatsappReplyButtons> = {
  tax: hmgTaxButtons,
  books: hmgBooksButtons,
  audit_other: hmgAuditButtons,
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

    if (isHmgRestart(text)) {
      if (isHumanHandoffState(conversation.currentState)) {
        const resumed = await this.stateMachine.resumeAutomation(
          conversation.id,
          'hmg_consultation',
        );
        conversation.currentState = resumed.currentState;
      }
      return this.openTopicMenu(conversation);
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
    return buttonReply(hmgMenuButtons());
  }

  private async continueSession(
    conversation: Conversation,
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    if (session.currentStep === HMG_STEPS.AWAITING_TOPIC) {
      return this.handleTopic(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_TAX) {
      return this.handleServiceChoices(session, text, HMG_TAX_CHOICES);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_BOOKS) {
      return this.handleServiceChoices(session, text, HMG_BOOKS_CHOICES);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_AUDIT) {
      return this.handleServiceChoices(session, text, HMG_AUDIT_CHOICES);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_OTHER) {
      return this.handleOther(conversation, session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_MEETING) {
      return this.handleMeeting(session, text);
    }
    if (session.currentStep === HMG_STEPS.AWAITING_NAME) {
      return this.handleName(conversation, session, text);
    }
    return this.openTopicMenu(conversation);
  }

  private async handleTopic(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchHmgMenu(text);
    if (!matched) {
      return buttonReply(hmgMenuButtons());
    }
    if (matched.type === 'menu') {
      return this.openSubmenu(session, matched.id);
    }
    return this.acceptService(session, matched.id);
  }

  private async openSubmenu(
    session: HmgSession,
    menuId: HmgMenuId,
  ): Promise<HmgReply> {
    await this.sessions.save(session, {
      step: MENU_STEP[menuId],
      payload: session.payload,
    });
    return buttonReply(MENU_BUTTONS[menuId]());
  }

  private async handleServiceChoices(
    session: HmgSession,
    text: string,
    choices: readonly HmgChoice[],
  ): Promise<HmgReply> {
    const matched = matchHmgChoice(text, choices);
    if (!matched) {
      return buttonReply(buttonsForChoices(choices));
    }
    return this.acceptService(session, matched.id as HmgServiceId);
  }

  private async acceptService(
    session: HmgSession,
    serviceId: HmgServiceId,
  ): Promise<HmgReply> {
    const payload: HmgPayload = { ...session.payload, serviceId };
    if (serviceId === 'something_else') {
      await this.sessions.save(session, {
        step: HMG_STEPS.AWAITING_OTHER,
        payload,
      });
      return { replyText: copy.HMG_OTHER_PROMPT };
    }
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_MEETING,
      payload,
    });
    return buttonReply(hmgMeetingButtons());
  }

  private async handleOther(
    conversation: Conversation,
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    if (!text) {
      return { replyText: copy.HMG_OTHER_PROMPT };
    }
    return this.finish(conversation, session, {
      ...session.payload,
      serviceId: 'something_else',
      brief: text,
    });
  }

  private async handleMeeting(
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    const matched = matchHmgChoice(text, HMG_MEETING_CHOICES);
    if (!matched) {
      return buttonReply(hmgMeetingButtons());
    }
    const payload: HmgPayload = {
      ...session.payload,
      meetingId: matched.id,
    };
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_NAME,
      payload,
    });
    return { replyText: copy.HMG_NAME_PROMPT };
  }

  private async handleName(
    conversation: Conversation,
    session: HmgSession,
    text: string,
  ): Promise<HmgReply> {
    if (!text) {
      return { replyText: copy.HMG_NAME_PROMPT };
    }
    return this.finish(conversation, session, {
      ...session.payload,
      contactName: text,
    });
  }

  private async finish(
    conversation: Conversation,
    session: HmgSession,
    payload: HmgPayload,
  ): Promise<HmgReply> {
    const stored: HmgPayload = {
      ...payload,
      contactPhone: payload.contactPhone ?? conversation.prospectPhone,
    };
    const reference = createHmgReference();
    await this.sessions.save(session, {
      step: HMG_STEPS.SUBMITTED,
      payload: stored,
    });
    await this.sessions.markSubmitted(session, reference);
    return { replyText: copy.hmgCompleted(stored) };
  }
}

function buttonReply(buttons: WhatsappReplyButtons): HmgReply {
  return { replyText: buttons.text, replyButtons: buttons };
}

function buttonsForChoices(choices: readonly HmgChoice[]): WhatsappReplyButtons {
  if (choices === HMG_TAX_CHOICES) {
    return hmgTaxButtons();
  }
  if (choices === HMG_BOOKS_CHOICES) {
    return hmgBooksButtons();
  }
  return hmgAuditButtons();
}

function createHmgReference(): string {
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `HMG-${suffix}`;
}
