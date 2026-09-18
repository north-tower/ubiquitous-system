export type ParsedGuestCount = {
  /**
   * Single number for Enquiry.guestEstimate. A range uses the upper bound
   * because that's the figure that matters for speakers, power, and crew —
   * quoting against the floor would under-provision.
   */
  estimate: number;
  /** Exactly what the customer typed, trimmed. */
  raw: string;
};

const WORD_NUMBERS: Record<string, number> = {
  ten: 10,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

/**
 * Reads a guest-count answer that may be a range ("400-1000"), an
 * approximation ("around 500", "500+"), a plain number, or a small word
 * ("a hundred"). Returns null when nothing numeric can be recovered.
 */
export function parseGuestCount(text: string): ParsedGuestCount | null {
  const raw = text.trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase().replace(/,/g, '');

  const range = normalized.match(/(\d+)\s*(?:-|–|—|to)\s*(\d+)/);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    if (low > 0 && high > 0) {
      return { estimate: Math.max(low, high), raw };
    }
  }

  const plus = normalized.match(/(\d+)\s*\+/);
  if (plus) {
    const estimate = Number(plus[1]);
    if (estimate > 0) {
      return { estimate, raw };
    }
  }

  const digits = normalized.match(/(\d+)/);
  if (digits) {
    const estimate = Number(digits[1]);
    if (estimate > 0) {
      return { estimate, raw };
    }
  }

  const word = matchWordNumber(normalized);
  if (word !== null) {
    return { estimate: word, raw };
  }

  return null;
}

function matchWordNumber(text: string): number | null {
  const twoHundred = text.match(/\b(two|three|four|five)\s+hundred\b/);
  if (twoHundred) {
    const map: Record<string, number> = {
      two: 200,
      three: 300,
      four: 400,
      five: 500,
    };
    return map[twoHundred[1]] ?? null;
  }

  if (/\ba\s+hundred\b/.test(text) || /\bhundred\b/.test(text)) {
    return 100;
  }
  if (/\ba\s+thousand\b/.test(text) || /\bthousand\b/.test(text)) {
    return 1000;
  }

  for (const [word, value] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      return value;
    }
  }
  return null;
}
