import { formatNumberedOptions } from '../enquiry-flow/match-numbered-option';
import {
  HMG_ENTITY_OPTIONS,
  HMG_KRA_STATUS_OPTIONS,
  HMG_MEETING_OPTIONS,
  HMG_PUT_THROUGH_OPTIONS,
  HMG_SERVICE_OPTIONS,
  HMG_TIMING_OPTIONS,
  hmgEntityIsPersonal,
  hmgEntityLabel,
  hmgKraStatusLabel,
  hmgMeetingLabel,
  hmgRequestLabel,
  hmgServiceLabel,
  hmgTimingLabel,
} from './hmg-options';
import type { HmgPayload } from './hmg-payload';

export const HMG_GREETING =
  'Hello 👋 Thank you for contacting HMG Group Africa. What would you like to discuss?';

export function hmgTopicReask(): string {
  return [
    'Please pick a service from the list, or reply with the number:',
    '',
    formatNumberedOptions(HMG_SERVICE_OPTIONS),
  ].join('\n');
}

export const HMG_ENTITY_PROMPT =
  'Is this for a business or for you personally?';

export function hmgEntityReask(): string {
  return [
    HMG_ENTITY_PROMPT,
    '',
    'Please choose an option from the list, or reply with the number:',
    '',
    formatNumberedOptions(HMG_ENTITY_OPTIONS),
  ].join('\n');
}

export function hmgBusinessNamePrompt(entityId: string): string {
  if (hmgEntityIsPersonal(entityId)) {
    return 'And your full name?';
  }
  return 'And the name of the business?';
}

export function hmgBusinessNameReask(entityId: string): string {
  return [
    hmgBusinessNamePrompt(entityId),
    '',
    'Send at least a couple of characters so we can note it on your request.',
  ].join('\n');
}

export const HMG_KRA_STATUS_PROMPT =
  'Where do things stand with KRA at the moment?';

export function hmgKraStatusReask(): string {
  return [
    HMG_KRA_STATUS_PROMPT,
    '',
    'Please choose an option from the list, or reply with the number:',
    '',
    formatNumberedOptions(HMG_KRA_STATUS_OPTIONS),
  ].join('\n');
}

export const HMG_TIMING_PROMPT =
  'How soon would you like to speak with an advisor?';

export function hmgTimingReask(): string {
  return [
    HMG_TIMING_PROMPT,
    '',
    'Please choose an option from the list, or reply with the number:',
    '',
    formatNumberedOptions(HMG_TIMING_OPTIONS),
  ].join('\n');
}

export const HMG_MEETING_PROMPT = 'And how would you prefer to meet?';

export function hmgMeetingReask(): string {
  return [
    HMG_MEETING_PROMPT,
    '',
    'Please choose an option from the list, or reply with the number:',
    '',
    formatNumberedOptions(HMG_MEETING_OPTIONS),
  ].join('\n');
}

export const HMG_PUT_THROUGH_PROMPT = [
  'Thank you 👍 Our advisors are available Monday to Friday, 8:00 AM – 5:00 PM.',
  'Shall I put this through?',
].join('\n');

export function hmgPutThroughReask(): string {
  return [
    HMG_PUT_THROUGH_PROMPT,
    '',
    'Please choose an option from the list, or reply with the number:',
    '',
    formatNumberedOptions(HMG_PUT_THROUGH_OPTIONS),
  ].join('\n');
}

export const HMG_BOOKING_NAME_PROMPT =
  'Certainly 👍 What name should we put on the booking?';

export function hmgBookingNameReask(): string {
  return [
    HMG_BOOKING_NAME_PROMPT,
    '',
    'Send at least a couple of characters so we can note it on your request.',
  ].join('\n');
}

export const HMG_BOOKING_PHONE_PROMPT =
  "And what's the best phone number to reach you?";

export function hmgBookingPhoneReask(): string {
  return [
    HMG_BOOKING_PHONE_PROMPT,
    '',
    'Send a Kenyan mobile number (e.g. 07XX XXX XXX).',
  ].join('\n');
}

export function hmgBriefPrompt(serviceId: string): string {
  const label = hmgServiceLabel(serviceId);
  return [
    `Great — *${label}*.`,
    '',
    'Briefly describe what you need, or share a preferred callback time.',
  ].join('\n');
}

export function hmgBriefReask(serviceId: string): string {
  return [
    hmgBriefPrompt(serviceId),
    '',
    'Send at least a short sentence so we can route your request.',
  ].join('\n');
}

export function hmgTaxKraSubmitted(
  reference: string,
  payload: HmgPayload,
): string {
  const label = hmgServiceLabel(payload.serviceId ?? 'tax_kra');
  const nameLabel = hmgEntityIsPersonal(payload.entityId ?? '')
    ? 'Name'
    : 'Business';
  const contactName = payload.contactName?.trim();
  const lines = [
    contactName
      ? `✅ Thank you, ${contactName}. Your consultation request has been captured. An advisor would now confirm a time with you and let you know what to have ready.`
      : '✅ Thank you. Your consultation request has been captured. An advisor will follow up on WhatsApp shortly.',
    '',
    '🗓️ *Consultation Requested*',
    '_Sent to the HMG Group Africa advisory team_',
    '',
    `• Enquiry: ${label}`,
    ...(payload.entityId
      ? [`• Client type: ${hmgEntityLabel(payload.entityId)}`]
      : []),
    ...(payload.businessName
      ? [`• ${nameLabel}: ${payload.businessName}`]
      : []),
    ...(payload.kraStatusId
      ? [`• KRA status: ${hmgKraStatusLabel(payload.kraStatusId)}`]
      : []),
    ...(payload.timingId
      ? [`• Timing: ${hmgTimingLabel(payload.timingId)}`]
      : []),
    ...(payload.meetingId
      ? [`• Consultation: ${hmgMeetingLabel(payload.meetingId)}`]
      : []),
    ...(payload.requestId
      ? [`• Request: ${hmgRequestLabel(payload.requestId)}`]
      : []),
    ...(contactName ? [`• Name: ${contactName}`] : []),
    ...(payload.contactPhone
      ? [`• Phone: ${payload.contactPhone}`]
      : []),
    '',
    `Reference: *${reference}* · Type *reset* to start again.`,
  ];
  return lines.join('\n');
}

export function hmgSubmitted(
  reference: string,
  serviceId: string,
  brief: string,
): string {
  const label = hmgServiceLabel(serviceId);
  return [
    `Thank you — your consultation request is logged as *${reference}*.`,
    '',
    `• Service: ${label}`,
    `• Details: ${brief}`,
    '',
    'A team member will follow up on WhatsApp. Type *reset* to start again.',
  ].join('\n');
}

export function hmgAlreadySubmitted(reference: string): string {
  return `We already have request *${reference}* on file. Type *reset* to send a new enquiry.`;
}
