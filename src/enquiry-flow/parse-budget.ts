export type ParsedBudget = {
  /** What the customer and staff see, always with a KES prefix when numeric. */
  display: string;
  /** Floor of a range, or the single figure, for the low-budget check. */
  amountKes: number | null;
};

export const BUDGET_BAND_AMOUNTS: Record<string, number | null> = {
  under50: 50_000,
  '50_150': 50_000,
  '150_300': 150_000,
  '300plus': 300_000,
  unsure: null,
};

export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString('en-KE')}`;
}

/**
 * Reads a budget answer: a numbered/labelled band, a figure ("23000",
 * "23k", "KES 80,000"), or a range ("50-100k"). Returns null when nothing
 * money-like can be recovered — skip is handled by the caller.
 */
export function parseBudget(text: string): ParsedBudget | null {
  const raw = text.trim();
  if (!raw) {
    return null;
  }

  const range = parseKesRange(raw);
  if (range) {
    return range;
  }

  const amount = parseKesAmount(raw);
  if (amount !== null) {
    return { display: formatKes(amount), amountKes: amount };
  }

  return null;
}

export function budgetLooksLow(input: {
  amountKes: number | null;
  guests?: number;
  services?: string;
}): boolean {
  const amount = input.amountKes;
  const guests = input.guests;
  if (amount === null || !guests || guests <= 0) {
    return false;
  }

  const full = /full package/i.test(input.services ?? '');
  if (full && guests >= 400 && amount < 150_000) {
    return true;
  }
  if (full && guests >= 200 && amount < 80_000) {
    return true;
  }
  if (guests >= 400 && amount < 50_000) {
    return true;
  }
  if (guests >= 200 && amount < 30_000) {
    return true;
  }
  return false;
}

function parseKesRange(text: string): ParsedBudget | null {
  const normalized = stripCurrency(text);
  const match = normalized.match(
    /(\d+(?:\.\d+)?)\s*(k)?\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(k)?/i,
  );
  if (!match) {
    return null;
  }
  const lowHadK = Boolean(match[2]);
  const highHadK = Boolean(match[4]);
  const low = scaleKes(Number(match[1]), lowHadK, highHadK);
  const high = scaleKes(Number(match[3]), highHadK, lowHadK);
  if (!(low > 0 && high > 0)) {
    return null;
  }
  const floor = Math.min(low, high);
  const ceil = Math.max(low, high);
  return {
    display: `${formatKes(floor)}–${ceil.toLocaleString('en-KE')}`,
    amountKes: floor,
  };
}

function scaleKes(amount: number, hadK: boolean, otherHadK: boolean): number {
  if (hadK) {
    return amount * 1000;
  }
  // "50-100k" means 50,000–100,000, not 50–100,000.
  if (otherHadK && amount < 1000) {
    return amount * 1000;
  }
  return amount;
}

function parseKesAmount(text: string): number | null {
  const normalized = stripCurrency(text);
  const withK = normalized.match(/^(\d+(?:\.\d+)?)\s*k$/i);
  if (withK) {
    const amount = Number(withK[1]) * 1000;
    return amount > 0 ? amount : null;
  }
  const digits = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (!digits) {
    return null;
  }
  const amount = Number(digits[1]);
  return amount > 0 ? amount : null;
}

function stripCurrency(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\b(kes|ksh|kshs|shs|kes\.|ksh\.)\b/g, '')
    .replace(/\/=\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
