import type { BaileysListMessageSpec } from './enquiry-baileys-interactive';
import { enquiryButtonsForStep } from './enquiry-interactive';
import type { WhatsappReplyButtons } from '../outbound/whatsapp-reply-buttons';
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
  /** Plain messages sent before replyText (e.g. ack after a poll tap). */
  prefaceTexts?: string[];
  twilioContent?: EnquiryTwilioContentKey;
  /** Twilio ContentVariables JSON keys (e.g. "1" for {{1}} in confirm templates). */
  twilioContentVariables?: Record<string, string>;
  baileysList?: BaileysListMessageSpec;
  /** Reply buttons when there are 1–3 choices (Baileys, Telnyx, Meta). */
  replyButtons?: WhatsappReplyButtons;
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
  const listPicker =
    spec?.kind === 'list-picker' ||
    step === ENQUIRY_STEPS.AWAITING_SERVICES;
  if (!listPicker) {
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
  const replyButtons = enquiryButtonsForStep(step, replyText);
  const twilioContent = ENQUIRY_STEP_TWILIO_CONTENT[step];
  const body = replyButtons?.text ?? replyText;
  if (!twilioContent) {
    return {
      replyText: body,
      ...(replyButtons ? { replyButtons } : {}),
    };
  }
  const twilioContentVariables = twilioListPickerVariables(step, replyText);
  return {
    replyText: body,
    twilioContent,
    ...(twilioContentVariables ? { twilioContentVariables } : {}),
    ...(replyButtons ? { replyButtons } : {}),
  };
}

export function confirmEnquiryReply(payload: EnquiryPayload): EnquiryReply {
  const replyText = confirmationPlayback(payload);
  const replyButtons = enquiryButtonsForStep(
    ENQUIRY_STEPS.AWAITING_CONFIRM,
    replyText,
  );
  return {
    replyText: replyButtons?.text ?? replyText,
    twilioContent: 'confirm',
    twilioContentVariables: { '1': formatSummary(payload) },
    ...(replyButtons ? { replyButtons } : {}),
  };
}
