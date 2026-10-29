import { formatNumberedOptions } from '../enquiry-flow/match-numbered-option';
import { HMG_SERVICE_OPTIONS, hmgServiceLabel } from './hmg-options';

export const HMG_GREETING =
  'Hello 👋 Thank you for contacting HMG Group Africa. What would you like to discuss?';

export function hmgTopicReask(): string {
  return [
    'Please pick a service from the list, or reply with the number:',
    '',
    formatNumberedOptions(HMG_SERVICE_OPTIONS),
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

export function hmgSubmitted(reference: string, serviceId: string, brief: string): string {
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
