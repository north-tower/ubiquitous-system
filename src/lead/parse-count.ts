/**
 * Pull the first integer from free text.
 * "about 50 a day" → 50, "~70/day" → 70, "40" → 40.
 */
export function parseCount(text: string): number | null {
  const normalized = text.toLowerCase().replace(/,/g, ' ');
  const match = normalized.match(/~?\s*(\d+)/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.round(value);
}
