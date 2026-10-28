import type { EnquiryPayload } from './enquiry-payload';
import type { EnquiryReply } from './enquiry-twilio-reply';

/** Short running recap of captured enquiry fields (WhatsApp-friendly). */
export function formatEnquiryStorySoFar(payload: EnquiryPayload): string {
  const lines: string[] = [];
  if (payload.eventType?.trim()) {
    lines.push(`Event — *${payload.eventType.trim()}*`);
  }
  const date =
    payload.eventDateDisplay?.trim() || payload.eventDate?.trim() || '';
  if (date) {
    lines.push(`Date — *${date}*`);
  }
  if (payload.requestedServices?.trim()) {
    lines.push(`Services — *${payload.requestedServices.trim()}*`);
  }
  const guests =
    payload.guestEstimateRaw?.trim() ||
    (payload.guestEstimate !== undefined
      ? String(payload.guestEstimate)
      : '');
  if (guests) {
    lines.push(`Guests — *${guests}*`);
  }
  if (payload.venue?.trim()) {
    lines.push(`Venue — *${payload.venue.trim()}*`);
  }
  if (payload.budgetRange?.trim()) {
    lines.push(`Budget — *${payload.budgetRange.trim()}*`);
  } else if (payload.budgetAmountKes) {
    lines.push(`Budget — *KES ${payload.budgetAmountKes.toLocaleString('en-KE')}*`);
  }
  if (payload.additionalDetails?.trim()) {
    lines.push(`Notes — *${payload.additionalDetails.trim()}*`);
  }
  if (lines.length === 0) {
    return '';
  }
  return ['*So far:*', ...lines].join('\n');
}

export function enrichEnquiryReplyWithStory(
  payload: EnquiryPayload,
  reply: EnquiryReply,
): EnquiryReply {
  const story = formatEnquiryStorySoFar(payload);
  if (!story) {
    return reply;
  }
  return {
    ...reply,
    prefaceTexts: [...(reply.prefaceTexts ?? []), story],
  };
}
