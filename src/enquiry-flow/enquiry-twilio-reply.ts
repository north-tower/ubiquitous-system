import { confirmationPlayback, formatSummary } from './enquiry-copy';
import type { EnquiryPayload } from './enquiry-payload';
import { ENQUIRY_STEPS, type EnquiryStep } from './enquiry-steps';
import { TWILIO_ENQUIRY_CONTENT_ENV } from './enquiry-twilio-content';

export type EnquiryTwilioContentKey = keyof typeof TWILIO_ENQUIRY_CONTENT_ENV;

/** FSM steps that may send a Twilio Content template when the env SID is set. */
export const ENQUIRY_STEP_TWILIO_CONTENT: Partial<
  Record<EnquiryStep, EnquiryTwilioContentKey>
> = {
  [ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE]: 'returningChoice',
  [ENQUIRY_STEPS.AWAITING_EVENT_TYPE]: 'eventType',
  [ENQUIRY_STEPS.AWAITING_BUDGET]: 'budget',
  [ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM]: 'budgetConfirm',
  [ENQUIRY_STEPS.AWAITING_PHONE]: 'phone',
  [ENQUIRY_STEPS.AWAITING_EDIT_FIELD]: 'editField',
  [ENQUIRY_STEPS.AWAITING_CONFIRM]: 'confirm',
};

export type EnquiryReply = {
  replyText: string;
  silent?: boolean;
  twilioContent?: EnquiryTwilioContentKey;
  /** Twilio ContentVariables JSON keys (e.g. "1" for {{1}} in confirm templates). */
  twilioContentVariables?: Record<string, string>;
};

export function enquiryTwilioContentEnvVar(
  key: EnquiryTwilioContentKey,
): string {
  return TWILIO_ENQUIRY_CONTENT_ENV[key];
}

export function enquiryReplyForStep(
  step: EnquiryStep,
  replyText: string,
): EnquiryReply {
  const twilioContent = ENQUIRY_STEP_TWILIO_CONTENT[step];
  if (!twilioContent) {
    return { replyText };
  }
  return { replyText, twilioContent };
}

export function confirmEnquiryReply(payload: EnquiryPayload): EnquiryReply {
  return {
    replyText: confirmationPlayback(payload),
    twilioContent: 'confirm',
    twilioContentVariables: { '1': formatSummary(payload) },
  };
}
