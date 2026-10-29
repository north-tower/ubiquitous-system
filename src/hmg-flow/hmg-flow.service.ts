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
import { hmgTopicButtonMessage, hmgTopicListMessage } from './hmg-interactive';
import { HMG_SERVICE_OPTIONS } from './hmg-options';
import type { TelnyxReplyButtonSpec } from '../outbound/telnyx-interactive-button';
import { HmgSession } from './hmg-session.entity';
import { HmgSessionService } from './hmg-session.service';
import type { HmgPayload } from './hmg-payload';
import { HMG_STEPS } from './hmg-steps';

export type HmgReply = {
  replyText: string;
  silent?: boolean;
  /** Interactive list (Baileys native list, or Twilio/Telnyx list fallback). */
  baileysList?: BaileysListMessageSpec;
  /** Up to 3 quick-reply buttons (Telnyx / WABA). */
  telnyxButtons?: TelnyxReplyButtonSpec;
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
      telnyxButtons: hmgTopicButtonMessage(list.text),
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
      const reaskBody =
        'Please tap a button below, or reply with a number (1–6) for other services.';
      return {
        replyText: copy.hmgTopicReask(),
        baileysList: {
          ...hmgTopicListMessage(),
          text: reaskBody,
        },
        telnyxButtons: hmgTopicButtonMessage(reaskBody),
      };
    }

    const payload: HmgPayload = { serviceId: matched.id };
    await this.sessions.save(session, {
      step: HMG_STEPS.AWAITING_BRIEF,
      payload,
    });
    return { replyText: copy.hmgBriefPrompt(matched.id) };
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
