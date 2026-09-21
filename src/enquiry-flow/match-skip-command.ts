const SKIP_PHRASES = [
  'skip',
  'none',
  'nothing',
  'n/a',
  'na',
  'no',
  'no thanks',
  'not sure',
  'unsure',
  'tbd',
  'later',
  'pass',
  '-',
] as const;

/** Optional answers — budget and extra details — the customer declined. */
export function matchSkipCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  return (SKIP_PHRASES as readonly string[]).includes(normalized);
}
