import {
  confirmList,
  eventTypeList,
  returningList,
  serviceList,
} from './enquiry-options';
import type { EnquiryPayload } from './enquiry-payload';

const HANDOVER_HINT = 'Type *agent* anytime to talk to the team.';

export const GREETING = [
  '*Divine Budget Entertainment* 🎉',
  'Your one-stop events and entertainment solution.',
  '',
  'What are you planning?',
  eventTypeList(),
  '',
  HANDOVER_HINT,
].join('\n');

export function welcomeBack(name: string): string {
  return [
    `Welcome back, ${greetingName(name)}.`,
    '',
    'What are you planning?',
    eventTypeList(),
    '',
    HANDOVER_HINT,
  ].join('\n');
}

export function returningChoice(payload: EnquiryPayload): string {
  const hello = payload.contactName
    ? `Hi ${greetingName(payload.contactName)} — `
    : '';
  const body = payload.upcomingEventTitle
    ? upcomingBlurb(payload)
    : payload.openEnquiryReference
      ? `we already have your enquiry *${payload.openEnquiryReference}*. Our team will follow up.`
      : 'we already have you on file. Our team will follow up.';

  return [
    `${hello}${body}`,
    '',
    returningList(),
  ].join('\n');
}

export const RETURNING_WAIT = (payload: EnquiryPayload): string =>
  [
    payload.openEnquiryReference
      ? `OK — the team still has *${payload.openEnquiryReference}*.`
      : 'OK — the team already has this.',
    'They will review it and get back to you. Type *2* if this is a new event instead.',
  ].join('\n');

export const REASK_RETURNING = [
  'Reply with a number so I know how to help.',
  returningList(),
].join('\n');

export const ASK_DATE = 'When is it? 📅';

export const ASK_SERVICES = [
  'What would you like us to handle? You can pick more than one — e.g. *1, 2* or *sound and lighting*.',
  serviceList(),
].join('\n');

export const ASK_GUESTS = 'Roughly how many guests?';

export const ASK_VENUE = 'And where is the venue?';

export const ASK_BUDGET =
  "What's the budget range for this? A figure or a range is enough — or type *skip*.";

export const ASK_DETAILS =
  'Anything else the team should know? Type *skip* if not.';

export const ASK_NAME = 'Great 👍 What name should we use?';

export const ASK_HANDOVER_NAME =
  "I'll pass you to the team. What name should they look for?";

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
  const next = payload.wantsCallback
    ? 'A teammate will pick this up and get back to you.'
    : 'Our team will review the details and respond.';
  return [
    `✅ ${thanks}`,
    '',
    'Your enquiry has been sent to the Divine Budget team.',
    next,
    '',
    `*Enquiry received* — ${reference}`,
    formatSummary(payload),
    '',
    'Quote this reference if you call or WhatsApp us about it.',
  ].join('\n');
}

export const ALREADY_SUBMITTED = (reference: string | null): string =>
  [
    reference
      ? `We've already sent this one in — reference *${reference}*.`
      : "We've already sent this one in.",
    'Our team will review it and respond. Type *agent* to reach them, or *reset* to start a new enquiry.',
  ].join('\n');

export const REASK_EVENT_TYPE = [
  "I didn't catch the event type — reply with a number from the list, or name it.",
  eventTypeList(),
].join('\n');

export const REASK_DATE =
  "I didn't catch a date. Something like *20th December* or *20/12/2026* works.";

export const REASK_SERVICES = [
  "I didn't catch that. Reply with numbers (you can pick more than one), name the services, or describe what you need.",
  serviceList(),
].join('\n');

export const REASK_GUESTS =
  "I didn't catch a guest count. A number or a range is enough — *500* or *400-1000*.";

export const REASK_VENUE =
  'Where is the venue? A town or a hall name is enough.';

export const REASK_BUDGET =
  "A budget figure or range is enough — *80k*, *50-100k* — or type *skip*.";

export const REASK_DETAILS =
  'Anything else to add? A sentence is enough, or type *skip*.';

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
  const guests =
    payload.guestEstimateRaw &&
    payload.guestEstimateRaw !== String(payload.guestEstimate ?? '')
      ? payload.guestEstimateRaw
      : payload.guestEstimate !== undefined
        ? String(payload.guestEstimate)
        : '—';

  const lines = [
    `Event: ${payload.eventType ?? '—'}`,
    `Date: ${payload.eventDateDisplay ?? payload.eventDate ?? '—'}`,
    `Services: ${payload.requestedServices ?? '—'}`,
    `Guests: ${guests}`,
    `Venue: ${payload.venue ?? '—'}`,
    `Budget: ${payload.budgetRange ?? '—'}`,
    `Details: ${payload.additionalDetails ?? '—'}`,
    `Name: ${payload.contactName ?? '—'}`,
    `Phone: ${payload.contactPhone ?? '—'}`,
  ];
  if (payload.wantsCallback) {
    lines.push('Asked to speak with the team');
  }
  return lines.join('\n');
}

export function greetingName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function upcomingBlurb(payload: EnquiryPayload): string {
  const title = payload.upcomingEventTitle ?? 'your event';
  const date = payload.upcomingEventDateDisplay
    ? ` on ${payload.upcomingEventDateDisplay}`
    : '';
  const status = payload.upcomingEventStatus;
  if (status === 'CONFIRMED') {
    return `your *${title}*${date} is confirmed with us.`;
  }
  if (status === 'IN_PROGRESS') {
    return `your *${title}* is currently under way.`;
  }
  return `we've got your request for *${title}*${date} — the team is still reviewing it.`;
}
