export const HOT_MIN_DAILY_ENQUIRIES = 30;
export const WARM_MIN_DAILY_ENQUIRIES = 5;
export const HOT_MIN_STAFF_HANDLING_MANUALLY = 1;

export const NEXT_ACTION_BY_SCORE = {
  HOT: 'Recommend immediate sales call',
  WARM: 'Send follow-up + demo deck',
  COLD: 'Add to nurture sequence',
} as const;

const NONE_SYSTEM_EXACT = [
  'none',
  'no',
  'n/a',
  'na',
  'nothing',
  'nope',
  'nil',
  'manual',
  'no system',
  'no crm',
  'just whatsapp',
  'just the phone',
] as const;

export function isNoneOrManualSystem(text: string | null): boolean {
  if (text === null) {
    return true;
  }
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) {
    return true;
  }
  if ((NONE_SYSTEM_EXACT as readonly string[]).includes(normalized)) {
    return true;
  }
  return (
    /\bno (system|crm|tool|software)\b/.test(normalized) ||
    /\b(don'?t|do not) have\b/.test(normalized) ||
    /\bmostly manual\b/.test(normalized)
  );
}
