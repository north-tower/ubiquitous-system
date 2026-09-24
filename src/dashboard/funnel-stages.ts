import type { EnquiryPayload } from '../enquiry-flow/enquiry-payload';
import { ENQUIRY_STEPS } from '../enquiry-flow/enquiry-steps';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { type FunnelStage } from './dashboard.types';

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

export const TECHFIND_FUNNEL_LABELS = [
  { key: 'whatsapp', label: 'WhatsApp conversations' },
  { key: 'business_identified', label: 'Business identified' },
  { key: 'simulation_started', label: 'Simulation started' },
  { key: 'simulation_completed', label: 'Simulation completed' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'meeting_booked', label: 'Meeting booked' },
  { key: 'customer', label: 'Customer' },
] as const;

/**
 * Enquiry intake stages follow the documented conversation, not the
 * Techfind demo FSM. Counts are cumulative: a later step also counts
 * as having reached every earlier one.
 */
export const ENQUIRY_FUNNEL_LABELS = [
  { key: 'whatsapp', label: 'WhatsApp conversations' },
  { key: 'started', label: 'Enquiry started' },
  { key: 'event_type', label: 'Event type' },
  { key: 'date', label: 'Preferred date' },
  { key: 'services', label: 'Services' },
  { key: 'guests', label: 'Guest count' },
  { key: 'venue', label: 'Venue' },
  { key: 'budget', label: 'Budget' },
  { key: 'details', label: 'Extra details' },
  { key: 'confirm', label: 'Ready to confirm' },
  { key: 'submitted', label: 'Filed with the team' },
] as const;

export const ENQUIRY_PROGRESS = {
  started: 1,
  eventType: 2,
  date: 3,
  services: 4,
  guests: 5,
  venue: 6,
  budget: 7,
  details: 8,
  confirm: 9,
  submitted: 10,
} as const;

const ENQUIRY_STEP_PROGRESS: Record<string, number> = {
  [ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE]: ENQUIRY_PROGRESS.started,
  [ENQUIRY_STEPS.AWAITING_EVENT_TYPE]: ENQUIRY_PROGRESS.started,
  [ENQUIRY_STEPS.AWAITING_DATE]: ENQUIRY_PROGRESS.eventType,
  [ENQUIRY_STEPS.AWAITING_SERVICES]: ENQUIRY_PROGRESS.date,
  [ENQUIRY_STEPS.AWAITING_GUESTS]: ENQUIRY_PROGRESS.services,
  [ENQUIRY_STEPS.AWAITING_VENUE]: ENQUIRY_PROGRESS.guests,
  [ENQUIRY_STEPS.AWAITING_VENUE_SITE]: ENQUIRY_PROGRESS.guests,
  [ENQUIRY_STEPS.AWAITING_BUDGET]: ENQUIRY_PROGRESS.venue,
  [ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM]: ENQUIRY_PROGRESS.venue,
  [ENQUIRY_STEPS.AWAITING_DETAILS]: ENQUIRY_PROGRESS.budget,
  [ENQUIRY_STEPS.AWAITING_NAME]: ENQUIRY_PROGRESS.details,
  [ENQUIRY_STEPS.AWAITING_PHONE]: ENQUIRY_PROGRESS.details,
  [ENQUIRY_STEPS.AWAITING_HANDOVER_NAME]: ENQUIRY_PROGRESS.started,
  [ENQUIRY_STEPS.AWAITING_EDIT_FIELD]: ENQUIRY_PROGRESS.confirm,
  [ENQUIRY_STEPS.AWAITING_CONFIRM]: ENQUIRY_PROGRESS.confirm,
  [ENQUIRY_STEPS.SUBMITTED]: ENQUIRY_PROGRESS.submitted,
};

export function conversionPercent(from: number, to: number): number {
  if (from <= 0) {
    return 0;
  }
  return Math.round((to / from) * 1000) / 10;
}

export function toFunnelStages(
  labels: ReadonlyArray<{ key: string; label: string }>,
  counts: number[],
): FunnelStage[] {
  return labels.map((label, index) => ({
    ...label,
    count: counts[index] ?? 0,
    conversionFromPrevious:
      index === 0
        ? null
        : conversionPercent(counts[index - 1] ?? 0, counts[index] ?? 0),
  }));
}

export function enquirySessionProgress(session: {
  currentStep: string;
  reference: string | null;
  payload: Pick<
    EnquiryPayload,
    | 'returnToConfirm'
    | 'eventType'
    | 'eventDate'
    | 'requestedServices'
    | 'guestEstimate'
    | 'venue'
  >;
}): number {
  if (
    session.currentStep === ENQUIRY_STEPS.SUBMITTED ||
    Boolean(session.reference)
  ) {
    return ENQUIRY_PROGRESS.submitted;
  }
  if (session.payload.returnToConfirm) {
    return ENQUIRY_PROGRESS.confirm;
  }
  const fromStep =
    ENQUIRY_STEP_PROGRESS[session.currentStep] ?? ENQUIRY_PROGRESS.started;
  return Math.max(fromStep, enquiryPayloadProgress(session.payload));
}

export function isFiledEnquiry(session: {
  currentStep: string;
  reference: string | null;
}): boolean {
  return (
    session.currentStep === ENQUIRY_STEPS.SUBMITTED ||
    Boolean(session.reference)
  );
}

export function latestByConversationId<
  T extends { conversationId: string; createdAt: Date },
>(rows: T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const previous = latest.get(row.conversationId);
    if (
      !previous ||
      row.createdAt.getTime() > previous.createdAt.getTime()
    ) {
      latest.set(row.conversationId, row);
    }
  }
  return latest;
}

function enquiryPayloadProgress(
  payload: Pick<
    EnquiryPayload,
    | 'eventType'
    | 'eventDate'
    | 'requestedServices'
    | 'guestEstimate'
    | 'venue'
  >,
): number {
  if (payload.venue) {
    return ENQUIRY_PROGRESS.venue;
  }
  if (payload.guestEstimate != null) {
    return ENQUIRY_PROGRESS.guests;
  }
  if (payload.requestedServices) {
    return ENQUIRY_PROGRESS.services;
  }
  if (payload.eventDate) {
    return ENQUIRY_PROGRESS.date;
  }
  if (payload.eventType) {
    return ENQUIRY_PROGRESS.eventType;
  }
  return 0;
}
