import { ConversationState } from './conversation-state.enum';

export function isHumanHandoffState(state: ConversationState): boolean {
  return state === ConversationState.HUMAN_HANDOFF;
}
