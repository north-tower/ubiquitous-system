import { ConversationState } from './conversation-state.enum';

/**
 * Happy-path edges plus reset-to-greeting from every state
 * (escape hatch per spec: reset / another business / show another example / exit demo).
 */
export const TRANSITION_TABLE: {
  readonly [K in ConversationState]: readonly ConversationState[];
} = {
  [ConversationState.NEW]: [ConversationState.TECHFIND_GREETING],
  [ConversationState.TECHFIND_GREETING]: [
    ConversationState.INDUSTRY_DISCOVERY,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.INDUSTRY_DISCOVERY]: [
    ConversationState.DEMO_SELECTED,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.DEMO_SELECTED]: [
    ConversationState.DEMO_RUNNING,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.DEMO_RUNNING]: [
    ConversationState.DEMO_TRANSACTION,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.DEMO_TRANSACTION]: [
    ConversationState.VALUE_REVEAL,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.VALUE_REVEAL]: [
    ConversationState.BUSINESS_QUALIFICATION,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.BUSINESS_QUALIFICATION]: [
    ConversationState.LEAD_SCORED,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.LEAD_SCORED]: [
    ConversationState.MEETING_OFFERED,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.MEETING_OFFERED]: [
    ConversationState.MEETING_BOOKED,
    ConversationState.HUMAN_HANDOFF,
    ConversationState.TECHFIND_GREETING,
  ],
  [ConversationState.MEETING_BOOKED]: [ConversationState.TECHFIND_GREETING],
  [ConversationState.HUMAN_HANDOFF]: [ConversationState.TECHFIND_GREETING],
};
