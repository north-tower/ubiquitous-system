import type { ConfigService } from '@nestjs/config';

/** Last 4 chars of HX… SID — enough to match env without logging full SID. */
export function maskContentSid(sid: string): string {
  const trimmed = sid.trim();
  if (trimmed.length <= 4) {
    return '****';
  }
  return `HX…${trimmed.slice(-4)}`;
}

export function isTwilioContentSendDebug(config: ConfigService): boolean {
  const raw = config.get<string>('TWILIO_CONTENT_SEND_DEBUG')?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function summarizeContentVariables(
  variables: Record<string, string> | undefined,
): { count: number; keys: string[]; valueLengths: Record<string, number> } {
  if (!variables || Object.keys(variables).length === 0) {
    return { count: 0, keys: [], valueLengths: {} };
  }
  const valueLengths: Record<string, number> = {};
  for (const [key, value] of Object.entries(variables)) {
    valueLengths[key] = value.length;
  }
  return { count: Object.keys(variables).length, keys: Object.keys(variables), valueLengths };
}

/** Preview variable values for debug logs (truncated). */
export function previewContentVariables(
  variables: Record<string, string> | undefined,
  maxLen = 120,
): Record<string, string> | null {
  if (!variables || Object.keys(variables).length === 0) {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    out[key] =
      value.length <= maxLen ? value : `${value.slice(0, maxLen)}…(${value.length} chars)`;
  }
  return out;
}

export function maskWhatsappAddress(address: string): string {
  const digits = address.replace(/\D/g, '');
  if (digits.length <= 4) {
    return '****';
  }
  return `…${digits.slice(-4)}`;
}
