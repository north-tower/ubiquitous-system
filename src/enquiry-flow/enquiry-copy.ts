import {
  confirmList,
  eventTypeList,
  intentList,
  serviceList,
} from './enquiry-options';
import type { EnquiryPayload } from './enquiry-payload';

export const GREETING = [
  '*Divine Budget Entertainment* 🎉',
  'Your one-stop events and entertainment solution.',
  '',
  'What are you planning?',
  eventTypeList(),
].join('\n');

export const ASK_DATE = 'When is it? 📅';

export const ASK_SERVICES = [
  'What would you like us to handle?',
  serviceList(),
].join('\n');

export const ASK_GUESTS = 'Roughly how many guests?';

export const ASK_VENUE = 'And where is the venue?';

export const ASK_INTENT = [
  "Thank you 🙏 Our team will confirm we're free on that date and put a quote together for you.",
  '',
  'How would you like to proceed?',
  intentList(),
].join('\n');

export const ASK_NAME = 'Great 👍 What name should we use?';

export function askPhone(whatsappDisplay: string): string {
  return [
    "And what's the best phone number to reach you?",
    '',
    `Reply *1* to use ${whatsappDisplay} (the WhatsApp number you're messaging from), or type a different one.`,
  ].join('\n');
}

export function confirmationPlayback(payload: EnquiryPayload): string {
  return [
    'Please check this before I send it to the team:',
    '',
    formatSummary(payload),
    '',
    'Does that look right?',
    confirmList(),
  ].join('\n');
}

export function submittedReply(
  payload: EnquiryPayload,
  reference: string,
): string {
  const thanks = payload.contactName
    ? `Thank you, ${payload.contactName}.`
    : 'Thank you.';
  return [
    `✅ ${thanks}`,
    '',
    'Your event details have been captured.',
    'Our team will now confirm availability for that date and come back to you with a quote.',
    '',
    `*Booking enquiry received* — ${reference}`,
    formatSummary(payload),
    '',
    'Sent to the Divine Budget team. Quote this reference if you call or WhatsApp us about it.',
  ].join('\n');
}

export const ALREADY_SUBMITTED = (reference: string | null): string =>
  [
    reference
      ? `We've already sent this one in — reference *${reference}*.`
      : "We've already sent this one in.",
    'Our team will be in touch. Type *reset* if you want to start a new enquiry.',
  ].join('\n');

export const REASK_EVENT_TYPE = [
  "I didn't catch the event type — reply with a number from the list, or name it.",
  eventTypeList(),
].join('\n');

export const REASK_DATE =
  "I didn't catch a date. Something like *20th December* or *20/12/2026* works.";

export const REASK_SERVICES = [
  "I didn't catch that. Reply with a number, or say what you'd like us to handle.",
  serviceList(),
].join('\n');

export const REASK_GUESTS =
  "I didn't catch a guest count. A number or a range is enough — *500* or *400-1000*.";

export const REASK_VENUE =
  'Where is the venue? A town or a hall name is enough.';

export const REASK_INTENT = [
  'Reply with a number so I know how to proceed.',
  intentList(),
].join('\n');

export const REASK_NAME = 'What name should we use?';

export const REASK_PHONE =
  "I need a Kenyan number I can actually ring — *0798 229 340* or reply *1* to use the WhatsApp number you're on.";

export const REASK_CONFIRM = [
  'Reply *1* to send it, or *2* to start over.',
  confirmList(),
].join('\n');

export const SUBMIT_FAILED =
  "I have your details, but I couldn't reach the team just now. Please try sending that last reply again in a moment — nothing has been lost.";

export const NOT_CONFIGURED =
  "I have your details, but we can't file them automatically right now. Please WhatsApp or call the team directly and we'll pick this up.";

export function formatSummary(payload: EnquiryPayload): string {
  const intent = payload.wantsCallback
    ? 'Talk to the team'
    : 'Date check & quote';
  const guests =
    payload.guestEstimateRaw &&
    payload.guestEstimateRaw !== String(payload.guestEstimate ?? '')
      ? payload.guestEstimateRaw
      : payload.guestEstimate !== undefined
        ? String(payload.guestEstimate)
        : '—';

  return [
    `Event: ${payload.eventType ?? '—'}`,
    `Date: ${payload.eventDateDisplay ?? payload.eventDate ?? '—'}`,
    `Services: ${payload.requestedServices ?? '—'}`,
    `Guests: ${guests}`,
    `Venue: ${payload.venue ?? '—'}`,
    `Request: ${intent}`,
    `Name: ${payload.contactName ?? '—'}`,
    `Phone: ${payload.contactPhone ?? '—'}`,
  ].join('\n');
}
