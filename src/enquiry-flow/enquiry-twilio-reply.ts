import { confirmationPlayback, formatSummary } from './enquiry-copy';
import type { EnquiryPayload } from './enquiry-payload';
import { ENQUIRY_STEPS, type EnquiryStep } from './enquiry-steps';
import {
  ENQUIRY_TWILIO_CONTENT_BY_STEP,
  TWILIO_ENQUIRY_CONTENT_ENV,
} from './enquiry-twilio-content';

export type EnquiryTwilioContentKey = keyof typeof TWILIO_ENQUIRY_CONTENT_ENV;

/** FSM steps that may send a Twilio Content template when the env SID is set. */
export const ENQUIRY_STEP_TWILIO_CONTENT: Partial<
  Record<EnquiryStep, EnquiryTwilioContentKey>
> = {
  [ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE]: 'returningChoice',
  [ENQUIRY_STEPS.AWAITING_EVENT_TYPE]: 'eventType',
  [ENQUIRY_STEPS.AWAITING_SERVICES]: 'services',
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

/** First line of outbound copy → Twilio {{1}} for list-picker body text. */
export function twilioListPickerVariables(
  step: EnquiryStep,
  replyText: string,
): Record<string, string> | undefined {
  const spec = ENQUIRY_TWILIO_CONTENT_BY_STEP[step];
  if (spec?.kind !== 'list-picker') {
    return undefined;
  }
  const line = replyText
    .split('\n')
    .map((row) => row.trim())
    .find((row) => row.length > 0);
  if (!line) {
    return undefined;
  }
  return { '1': line.replace(/\*/g, '') };
}

export function enquiryReplyForStep(
  step: EnquiryStep,
  replyText: string,
): EnquiryReply {
  const twilioContent = ENQUIRY_STEP_TWILIO_CONTENT[step];
  if (!twilioContent) {
    return { replyText };
  }
  const twilioContentVariables = twilioListPickerVariables(step, replyText);
  return {
    replyText,
    twilioContent,
    ...(twilioContentVariables ? { twilioContentVariables } : {}),
  };
}

export function confirmEnquiryReply(payload: EnquiryPayload): EnquiryReply {
  return {
    replyText: confirmationPlayback(payload),
    twilioContent: 'confirm',
    twilioContentVariables: { '1': formatSummary(payload) },
  };
}
