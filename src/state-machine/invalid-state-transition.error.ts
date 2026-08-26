import { ConversationState } from './conversation-state.enum';

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly conversationId: string,
    public readonly fromState: ConversationState,
    public readonly toState: ConversationState,
  ) {
    super(
      `Invalid state transition: ${fromState} -> ${toState} (conversation ${conversationId})`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class ConversationNotFoundError extends Error {
  constructor(public readonly conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = 'ConversationNotFoundError';
  }
}
