import { ConversationState } from './conversation-state.enum';
import { TRANSITION_TABLE } from './transition-table';

export function canTransition(
  fromState: ConversationState,
  toState: ConversationState,
): boolean {
  return TRANSITION_TABLE[fromState].includes(toState);
}
