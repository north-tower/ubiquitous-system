import { ConversationState } from '../state-machine/conversation-state.enum';

export const SIMULATION_STARTED_STATES: ReadonlySet<ConversationState> =
  new Set([
    ConversationState.DEMO_SELECTED,
    ConversationState.DEMO_RUNNING,
    ConversationState.DEMO_TRANSACTION,
    ConversationState.VALUE_REVEAL,
    ConversationState.BUSINESS_QUALIFICATION,
    ConversationState.LEAD_SCORED,
    ConversationState.MEETING_OFFERED,
    ConversationState.MEETING_BOOKED,
    ConversationState.HUMAN_HANDOFF,
  ]);

export const SIMULATION_COMPLETED_STATES: ReadonlySet<ConversationState> =
  new Set([
    ConversationState.VALUE_REVEAL,
    ConversationState.BUSINESS_QUALIFICATION,
    ConversationState.LEAD_SCORED,
    ConversationState.MEETING_OFFERED,
    ConversationState.MEETING_BOOKED,
    ConversationState.HUMAN_HANDOFF,
  ]);

export const QUALIFIED_STATES: ReadonlySet<ConversationState> = new Set([
  ConversationState.LEAD_SCORED,
  ConversationState.MEETING_OFFERED,
  ConversationState.MEETING_BOOKED,
  ConversationState.HUMAN_HANDOFF,
]);

export const ANALYTICS_DEMO_MODES = ['salon', 'solar'] as const;

export function conversionPercent(from: number, to: number): number {
  if (from <= 0) {
    return 0;
  }
  return Math.round((to / from) * 1000) / 10;
}
