export type ParsedVenue = {
  display: string;
  town?: string;
  site?: string;
  needsSite: boolean;
};

const SITE_WORDS =
  /\b(hall|hotel|gardens?|grounds|club|church|school|resort|centre|center|park|arena|stadium|home|house|tent|lodge|plaza|mall)\b/i;

const SMALL_WORDS = new Set(['the', 'and', 'of', 'at', 'in']);

/**
 * Title-cases a place name. Short all-letter tokens (ABC, DJ) stay
 * uppercase so venue brands don't become "Abc Gardens".
 */
export function titleCasePlace(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((word, index) => titleCaseWord(word, index === 0))
    .join(' ');
}

/**
 * Reads a venue answer. A single town like "nakuru" is accepted but marked
 * so the flow can ask for the site (indoor/outdoor, power, access). A comma
 * or "at" is treated as town + site in one reply.
 */
export function parseVenue(text: string): ParsedVenue | null {
  const raw = text.trim();
  if (!raw) {
    return null;
  }

  const comma = raw.split(/\s*,\s*/).filter((part) => part.trim());
  if (comma.length >= 2) {
    const first = titleCasePlace(comma[0]);
    const rest = titleCasePlace(comma.slice(1).join(', '));
    const firstIsTown = comma[0].trim().split(/\s+/).length <= 2;
    if (firstIsTown) {
      return {
        display: `${rest}, ${first}`,
        town: first,
        site: rest,
        needsSite: false,
      };
    }
    return {
      display: `${first}, ${rest}`,
      town: rest,
      site: first,
      needsSite: false,
    };
  }

  const at = raw.split(/\s+\bat\b\s+/i);
  if (at.length === 2 && at[0].trim() && at[1].trim()) {
    const site = titleCasePlace(at[0]);
    const town = titleCasePlace(at[1]);
    return { display: `${site}, ${town}`, town, site, needsSite: false };
  }

  const titled = titleCasePlace(raw);
  const words = raw.split(/\s+/).length;
  if (words <= 2 && !SITE_WORDS.test(raw)) {
    return { display: titled, town: titled, needsSite: true };
  }
  return { display: titled, site: titled, needsSite: false };
}

export function combineVenue(town: string, site: string | undefined): string {
  const namedSite = site?.trim();
  if (!namedSite) {
    return town;
  }
  return `${namedSite}, ${town}`;
}

function titleCaseWord(word: string, isFirst: boolean): string {
  const lower = word.toLowerCase();
  if (!isFirst && SMALL_WORDS.has(lower)) {
    return lower;
  }
  const letters = word.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 0 && letters.length <= 3 && /^[a-zA-Z]+$/.test(letters)) {
    return word.toUpperCase();
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
