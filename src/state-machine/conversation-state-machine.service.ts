import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
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
}
