import type { HmgPayload } from './hmg-payload';
import { hmgServiceLabel } from './hmg-options';

export const HMG_MENU_INTRO = [
  'Hello 👋 Thank you for contacting HMG Group Africa.',
  'What would you like to discuss?',
].join('\n');

export const HMG_WHICH_ONE = 'Which one?';

export const HMG_MEETING_PROMPT = 'How would you like to meet?';

export const HMG_NAME_PROMPT = "Last step. What's your name?";

export const HMG_OTHER_PROMPT =
  'Tell us briefly what you need, and we will get back to you.';

export const HMG_REPLY_WITH_NUMBER = 'Reply with a number.';

export const HMG_DISCOVERY_NOTE =
  'Details will be covered on your discovery call.';

export function hmgCompleted(payload: HmgPayload): string {
  const service = hmgServiceLabel(payload.serviceId ?? 'something_else');
  const name = payload.contactName?.trim();
  const thanks = name
    ? `Thank you, ${name}. We have your request for ${service}.`
    : `Thank you. We have your request for ${service}.`;
  const follow =
    payload.serviceId === 'something_else'
      ? 'We will get back to you soon.'
      : payload.meetingId === 'call_me'
        ? 'We will call you shortly.'
        : 'We will send a booking link shortly.';
  return [thanks, follow, HMG_DISCOVERY_NOTE].join('\n');
}

export function hmgAlreadySubmitted(reference: string): string {
  return `We already have request *${reference}* on file. Type *menu* to start again.`;
}
