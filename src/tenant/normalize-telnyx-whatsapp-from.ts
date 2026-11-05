import { toDigits } from '../outbound/whatsapp-channel';

/** Normalize a Telnyx WABA sender to E.164 for storage and lookup. */
export function normalizeTelnyxWhatsappFrom(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Telnyx WhatsApp number is required');
  }
  if (/^[A-Z]{2}\./.test(trimmed)) {
    return trimmed;
  }
  const e164 = trimmed.startsWith('+')
    ? trimmed.replace(/\s/g, '')
    : `+${toDigits(trimmed)}`;
  if (!/^\+\d{8,15}$/.test(e164)) {
    throw new Error(
      'Enter a valid E.164 WhatsApp number (e.g. +254712345678)',
    );
  }
  return e164;
}
