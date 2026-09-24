import {
  budgetConfirmList,
  budgetList,
  confirmList,
  editFieldList,
  eventTypeList,
  returningList,
  serviceList,
} from './enquiry-options';
import type { EnquiryPayload } from './enquiry-payload';

const HANDOVER_HINT = 'Type *agent* anytime to talk to the team.';
const PROGRESS = {
  event: '1 of 6',
  date: '2 of 6',
  services: '3 of 6',
  guests: '4 of 6',
  venue: '5 of 6',
  budget: '6 of 6',
} as const;

export const ASK_EVENT_TYPE = [
  `What are you planning? (${PROGRESS.event})`,
  eventTypeList(),
].join('\n');

export const GREETING = [
  'Hi — this is *Divine Budgets*.',
  'Events, sound, lighting, and entertainment.',
  '',
  ASK_EVENT_TYPE,
  '',
  HANDOVER_HINT,
].join('\n');

export function welcomeBack(name: string): string {
  return [
    `Welcome back, ${greetingName(name)}.`,
    '',
    ASK_EVENT_TYPE,
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

  return [`${hello}${body}`, '', returningList()].join('\n');
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

export const ASK_DATE = `When is it? 📅 (${PROGRESS.date})`;

export const ASK_SERVICES = [
  `What would you like us to handle? You can pick more than one — e.g. *1, 2* or *sound and lighting*. (${PROGRESS.services})`,
  serviceList(),
].join('\n');

export const ASK_GUESTS = `Roughly how many guests? (${PROGRESS.guests})`;

export const ASK_VENUE = [
  `Where is the venue? Town and site name if you have it — e.g. *Nakuru, ABC Gardens*. (${PROGRESS.venue})`,
  'Sound and lighting depend on the site (indoor or outdoor, power, access).',
].join('\n');

export const ASK_VENUE_SITE =
  "What's the venue or site name? A hall, hotel, home, or grounds — or type *skip* if you don't know yet.";

export const ASK_BUDGET = [
  `What's the budget range for this? (${PROGRESS.budget})`,
  budgetList(),
  '',
  'A figure also works — *80k* or *KES 80,000* — or type *skip*.',
].join('\n');

export function askBudgetLow(display: string): string {
  return [
    `${display} is on the low side for a full setup at this size.`,
    'Do you want to adjust it, or should I send it as is?',
    budgetConfirmList(),
  ].join('\n');
}

export const ASK_DETAILS =
  'Anything else the team should know? Type *skip* if not.';

export const ASK_NAME = 'What name should we put on the enquiry?';

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

export const ASK_EDIT_FIELD = [
  'Which part should I change?',
  editFieldList(),
].join('\n');

export function submittedReply(
  payload: EnquiryPayload,
  reference: string,
): string {
  const thanks = payload.contactName
    ? `Thank you, ${greetingName(payload.contactName)}.`
    : 'Thank you.';
  const next = payload.wantsCallback
    ? 'A teammate will pick this up and WhatsApp you within 2 business hours (8am–6pm).'
    : 'A teammate will review the details and WhatsApp you within 2 business hours (8am–6pm).';
  return [
    `✅ ${thanks}`,
    '',
    `We've got it — *${reference}*.`,
    next,
    '',
    'Send a location pin, photos, or inspiration any time and we will attach it.',
    'Type *status* to check where this enquiry stands, or *agent* to reach the team.',
  ].join('\n');
}

export const ALREADY_SUBMITTED = (reference: string | null): string =>
  [
    reference
      ? `We've already sent this one in — reference *${reference}*.`
      : "We've already sent this one in.",
    'A teammate will WhatsApp you within 2 business hours (8am–6pm). Type *status* to check it, *agent* to reach them, or *reset* to start a new enquiry.',
  ].join('\n');

export function statusReply(input: {
  reference: string | null;
  status: string | null;
  inProgress: boolean;
}): string {
  if (input.inProgress) {
    return "We're still putting this enquiry together — nothing has been sent yet. Type *agent* if you'd rather talk to the team now.";
  }
  if (!input.reference) {
    return "I don't have a filed enquiry on this number yet. Type *reset* to start one, or *agent* to reach the team.";
  }
  const standing = statusLabel(input.status);
  return [
    `Enquiry *${input.reference}* ${standing}.`,
    'A teammate will WhatsApp you within 2 business hours (8am–6pm). Type *agent* to reach them now.',
  ].join('\n');
}

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
  'Town and site if you have it — e.g. *Nakuru, ABC Gardens* — or just the town.';

export const REASK_VENUE_SITE =
  'A hall, hotel, home, or grounds name is enough, or type *skip*.';

export const REASK_BUDGET = [
  'Reply with a number from the list, a figure like *80k*, or type *skip*.',
  budgetList(),
].join('\n');

export const REASK_BUDGET_CONFIRM = [
  'Reply *1* to send that budget as is, or *2* to pick a different one.',
  budgetConfirmList(),
].join('\n');

export const REASK_DETAILS =
  'Anything else to add? A sentence is enough, or type *skip*.';

export const REASK_NAME =
  'What name should we put on the enquiry? A first name is enough.';

export const REASK_PHONE =
  "I need a Kenyan number I can actually ring — *0798 229 340* or reply *1* to use the WhatsApp number you're on.";

export const REASK_CONFIRM = [
  'Reply *1* to send it, or *2* to edit a field.',
  confirmList(),
].join('\n');

export const REASK_EDIT_FIELD = [
  'Reply with a number for the part to change.',
  editFieldList(),
].join('\n');

export const SUBMIT_FAILED =
  "I have your details, but I couldn't reach the team just now. Please try sending that last reply again in a moment — nothing has been lost.";

export const NOT_CONFIGURED =
  "I have your details, but we can't file them automatically right now. Please WhatsApp or call the team directly and we'll pick this up.";

export const STAFF_BUDGET_FLAG =
  'Staff note: budget looks low for this guest count / package — qualify before quoting.';

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

function statusLabel(status: string | null): string {
  switch (status) {
    case 'ASSIGNED':
      return 'is with the team';
    case 'CONTACTED':
      return 'has been contacted';
    case 'QUALIFIED':
      return 'is being qualified';
    case 'QUOTED':
      return 'has a quote in progress';
    default:
      return 'is with the team for review';
  }
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
