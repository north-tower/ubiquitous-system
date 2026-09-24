import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
import type { TenantFlow } from '../tenant/tenant-flow';
import { canTransition } from './can-transition';
import { ConversationState } from './conversation-state.enum';
import {
  ConversationNotFoundError,
  InvalidStateTransitionError,
} from './invalid-state-transition.error';

export type TransitionContext = {
  reset?: boolean;
  demoMode?: string | null;
};

@Injectable()
export class ConversationStateMachineService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
  ) {}

  canTransition(
    fromState: ConversationState,
    toState: ConversationState,
  ): boolean {
    return canTransition(fromState, toState);
  }

  async transition(
    conversationId: string,
    toState: ConversationState,
    context?: TransitionContext,
  ): Promise<Conversation> {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (!this.canTransition(conversation.currentState, toState)) {
      throw new InvalidStateTransitionError(
        conversationId,
        conversation.currentState,
        toState,
      );
    }

    conversation.currentState = toState;
    if (context?.reset) {
      conversation.demoMode = null;
    } else if (context && 'demoMode' in context) {
      conversation.demoMode = context.demoMode ?? null;
    }

    return this.conversations.save(conversation);
  }

  /** Pause bot automation so staff can reply manually on WhatsApp. */
  async enterHumanHandoff(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }
    if (conversation.currentState === ConversationState.HUMAN_HANDOFF) {
      return conversation;
    }
    conversation.currentState = ConversationState.HUMAN_HANDOFF;
    return this.conversations.save(conversation);
  }

  /** Turn automation back on after handoff (customer *reset* or staff action). */
  async resumeAutomation(
    conversationId: string,
    flow: TenantFlow,
  ): Promise<Conversation> {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }
    if (conversation.currentState !== ConversationState.HUMAN_HANDOFF) {
      return conversation;
    }

    conversation.demoMode = null;
    conversation.currentState =
      flow === 'enquiry_intake'
        ? ConversationState.NEW
        : ConversationState.TECHFIND_GREETING;

    return this.conversations.save(conversation);
  }
}
