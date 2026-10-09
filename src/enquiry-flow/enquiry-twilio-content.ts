import { ENQUIRY_STEPS, type EnquiryStep } from './enquiry-steps';

/**
 * Twilio Content types for WhatsApp (in-session). See:
 * https://www.twilio.com/docs/content/content-types-overview
 *
 * Baileys/Meta tenants keep numbered text from enquiry-copy; only Twilio uses these.
 */
export type TwilioEnquiryContentKind =
  | 'text'
  | 'list-picker'
  | 'quick-reply'
  | 'call-to-action'
  | 'whatsapp-flow';

export type EnquiryTwilioContentSpec = {
  /** FSM step this outbound prompt belongs to. */
  step: EnquiryStep;
  /** Human label for Content Template Builder / ops. */
  label: string;
  /** Primary Twilio type to use for this prompt. */
  kind: TwilioEnquiryContentKind;
  /** When kind is not text, why a simpler type is insufficient. */
  rationale: string;
  /** Option count if the step presents choices (for list vs quick-reply limits). */
  choiceCount?: number;
  /** Maps to enquiry-options ids where applicable; list `id` / quick-reply `id` should match. */
  optionSource?: string;
  /** Proposed env var for Content SID (HX…). Empty = not wired in outbound yet. */
  envVar: string;
  /** Wired in code (EnquiryReply.twilioContent + env SID). */
  implemented: boolean;
  /**
   * How inbound should reach matchNumberedOption / parsers.
   * list-picker → ListId (see parse-twilio.ts).
   * quick-reply → extend parser for ButtonPayload when implemented.
   */
  inboundHint: string;
};

/** Env keys referenced by enquiry Twilio templates (implement mapping in outbound layer). */
export const TWILIO_ENQUIRY_CONTENT_ENV = {
  eventType: 'TWILIO_EVENT_TYPE_CONTENT_SID',
  returningChoice: 'TWILIO_ENQUIRY_RETURNING_CONTENT_SID',
  /** In-session list-picker (multi-select still via typed numbers in copy). */
  services: 'TWILIO_ENQUIRY_SERVICES_CONTENT_SID',
  /** WhatsApp Flow (CheckboxGroup) — optional future; not wired in outbound yet. */
  servicesFlow: 'TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID',
  budget: 'TWILIO_ENQUIRY_BUDGET_CONTENT_SID',
  budgetConfirm: 'TWILIO_ENQUIRY_BUDGET_CONFIRM_CONTENT_SID',
  phone: 'TWILIO_ENQUIRY_PHONE_CONTENT_SID',
  confirm: 'TWILIO_ENQUIRY_CONFIRM_CONTENT_SID',
  editField: 'TWILIO_ENQUIRY_EDIT_FIELD_CONTENT_SID',
} as const;

/**
 * Best Twilio content type per enquiry_intake step (outbound prompts).
 * Re-ask copy for a step should reuse the same template as the primary ask.
 */
export const ENQUIRY_TWILIO_CONTENT_BY_STEP: Record<
  EnquiryStep,
  EnquiryTwilioContentSpec
> = {
  [ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE]: {
    step: ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE,
    label: 'Returning customer — wait vs new enquiry',
    kind: 'quick-reply',
    rationale:
      'Two mutually exclusive choices; fits in-session quick-reply (≤3 buttons).',
    choiceCount: 2,
    optionSource: 'RETURNING_OPTIONS',
    envVar: TWILIO_ENQUIRY_CONTENT_ENV.returningChoice,
    implemented: true,
    inboundHint:
      'Set action ids to returning option ids (wait, new); map ButtonPayload/Body to text.',
  },
  [ENQUIRY_STEPS.AWAITING_EVENT_TYPE]: {
    step: ENQUIRY_STEPS.AWAITING_EVENT_TYPE,
    label: 'What are you planning? (event type)',
    kind: 'list-picker',
    rationale:
      'Six options exceed quick-reply limit; list-picker supports up to 10 rows in one menu.',
    choiceCount: 6,
    optionSource: 'EVENT_TYPE_OPTIONS',
    envVar: TWILIO_ENQUIRY_CONTENT_ENV.eventType,
    implemented: true,
    inboundHint:
      'List item ids must match EVENT_TYPE_OPTIONS ids; parser uses ListId.',
  },
  [ENQUIRY_STEPS.AWAITING_DATE]: {
    step: ENQUIRY_STEPS.AWAITING_DATE,
    label: 'When is the event?',
    kind: 'text',
    rationale:
      'Free-form dates; WhatsApp has no native date picker in list/quick-reply. Optional future: whatsapp-flow date component.',
    envVar: '',
    implemented: false,
    inboundHint: 'Body text → parseEventDate.',
  },
  [ENQUIRY_STEPS.AWAITING_SERVICES]: {
    step: ENQUIRY_STEPS.AWAITING_SERVICES,
    label: 'Services needed (list + typed multi-select)',
    kind: 'list-picker',
    rationale:
      'List-picker for tappable rows; customers can still type *1, 2* or names for multi-select. Optional later: whatsapp-flow CheckboxGroup.',
    choiceCount: 5,
    optionSource: 'SERVICE_OPTIONS',
    envVar: TWILIO_ENQUIRY_CONTENT_ENV.services,
    implemented: true,
    inboundHint:
      'ListId = SERVICE_OPTIONS id (single pick); Body can still carry comma-separated numbers or labels.',
  },
  [ENQUIRY_STEPS.AWAITING_GUESTS]: {
    step: ENQUIRY_STEPS.AWAITING_GUESTS,
    label: 'Guest count',
    kind: 'text',
    rationale:
      'Backend accepts numbers and ranges; no fixed band list in code. Optional: quick-reply bands if product adds GUEST_BAND_OPTIONS.',
    envVar: '',
    implemented: false,
    inboundHint: 'Body text → parseGuestCount.',
  },
  [ENQUIRY_STEPS.AWAITING_VENUE]: {
    step: ENQUIRY_STEPS.AWAITING_VENUE,
    label: 'Venue town / location',
    kind: 'text',
    rationale: 'Free-text location; optional Flow short-text if you want a form shell.',
    envVar: '',
    implemented: false,
    inboundHint: 'Body text → parseVenue.',
  },
  [ENQUIRY_STEPS.AWAITING_VENUE_SITE]: {
    step: ENQUIRY_STEPS.AWAITING_VENUE_SITE,
    label: 'Venue site name (or skip)',
    kind: 'text',
    rationale:
      'Free-text or skip; optional quick-reply with single “Skip” plus text for name.',
    envVar: '',
    implemented: false,
    inboundHint: 'Body text or skip command.',
  },
  [ENQUIRY_STEPS.AWAITING_BUDGET]: {
    step: ENQUIRY_STEPS.AWAITING_BUDGET,
    label: 'Budget range',
    kind: 'list-picker',
    rationale: 'Five fixed bands plus free-text fallback in copy; list-picker covers bands cleanly.',
    choiceCount: 5,
    optionSource: 'BUDGET_OPTIONS',
    envVar: TWILIO_ENQUIRY_CONTENT_ENV.budget,
    implemented: true,
    inboundHint: 'ListId = BUDGET_OPTIONS id; free-text amounts still sent as Body if user types.',
  },
  [ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM]: {
    step: ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM,
    label: 'Low budget — send as-is or adjust',
    kind: 'quick-reply',
    rationale: 'Binary choice; two quick-reply buttons.',
    choiceCount: 2,
    optionSource: 'BUDGET_CONFIRM_OPTIONS',
    envVar: TWILIO_ENQUIRY_CONTENT_ENV.budgetConfirm,
    implemented: true,
    inboundHint: 'Action ids keep / adjust matching BUDGET_CONFIRM_OPTIONS.',
  },
  [ENQUIRY_STEPS.AWAITING_DETAILS]: {
    step: ENQUIRY_STEPS.AWAITING_DETAILS,
    label: 'Additional details (optional)',
    kind: 'text',
    rationale: 'Open-ended notes or skip; no template benefit.',
    envVar: '',
    implemented: false,
    inboundHint: 'Body or skip command.',
  },
  [ENQUIRY_STEPS.AWAITING_NAME]: {
    step: ENQUIRY_STEPS.AWAITING_NAME,
    label: 'Contact name',
    kind: 'text',
    rationale: 'Free-text name; Flow short-text only if bundled in a larger form.',
    envVar: '',
    implemented: false,
    inboundHint: 'Body → isLikelyPersonName.',
  },
  [ENQUIRY_STEPS.AWAITING_PHONE]: {
    step: ENQUIRY_STEPS.AWAITING_PHONE,
    label: 'Contact phone — use WhatsApp number or other',
    kind: 'quick-reply',
    rationale:
      'Primary path is “use this number” vs type another; one quick-reply + free-text for other.',
    choiceCount: 1,
    optionSource: 'implicit use_whatsapp_number',
    envVar: TWILIO_ENQUIRY_CONTENT_ENV.phone,
    implemented: true,
    inboundHint:
      'Quick-reply id e.g. use_whatsapp → treat as reply "1"; else parseKenyanPhone on Body.',
  },
  [ENQUIRY_STEPS.AWAITING_HANDOVER_NAME]: {
    step: ENQUIRY_STEPS.AWAITING_HANDOVER_NAME,
    label: 'Name before human handover',
    kind: 'text',
    rationale: 'Same as AWAITING_NAME; triggered from *agent* mid-flow.',
    envVar: '',
    implemented: false,
    inboundHint: 'Body → isLikelyPersonName then submit with wantsCallback.',
  },
  [ENQUIRY_STEPS.AWAITING_EDIT_FIELD]: {
    step: ENQUIRY_STEPS.AWAITING_EDIT_FIELD,
    label: 'Which field to edit',
    kind: 'list-picker',
    rationale: 'Nine edit targets; exceeds quick-reply; list-picker up to 10 rows.',
    choiceCount: 9,
    optionSource: 'EDIT_FIELD_OPTIONS',
    envVar: TWILIO_ENQUIRY_CONTENT_ENV.editField,
    implemented: true,
    inboundHint: 'ListId = EDIT_FIELD_OPTIONS id → editTarget() routing.',
  },
  [ENQUIRY_STEPS.AWAITING_CONFIRM]: {
    step: ENQUIRY_STEPS.AWAITING_CONFIRM,
    label: 'Summary + confirm or edit',
    kind: 'quick-reply',
    rationale:
      'Summary must stay in body text (dynamic); attach ≤2 quick-reply actions for confirm vs edit.',
    choiceCount: 2,
    optionSource: 'CONFIRM_OPTIONS',
    envVar: TWILIO_ENQUIRY_CONTENT_ENV.confirm,
    implemented: true,
    inboundHint:
      'Use variables in body for formatSummary output; actions map to confirm / edit ids.',
  },
  [ENQUIRY_STEPS.SUBMITTED]: {
    step: ENQUIRY_STEPS.SUBMITTED,
    label: 'Post-submit acknowledgement',
    kind: 'text',
    rationale:
      'Submitted reply is informational; optional call-to-action with tel: link to office if marketing wants a call button.',
    envVar: '',
    implemented: false,
    inboundHint: 'No FSM input; optional VOICE_CALL or URL in a follow-up template only.',
  },
};

/** Steps that should send a Twilio template (non-text) when env SID is set and channel is twilio. */
export function twilioInteractiveSteps(): EnquiryTwilioContentSpec[] {
  return Object.values(ENQUIRY_TWILIO_CONTENT_BY_STEP).filter(
    (row) => row.kind !== 'text' && row.envVar.length > 0,
  );
}
