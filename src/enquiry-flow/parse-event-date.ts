export type ParsedEventDate = {
  /** Calendar date the API stores, no time of day. */
  iso: string;
  /** Spelled out for the confirmation playback. */
  display: string;
};

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Turns a customer's "when is it?" answer into a calendar date.
 *
 * `now` is injected so the year-rollover boundary (20 Dec parsed in January
 * vs September) is testable rather than depending on when CI happens to run.
 *
 * Year omitted → the next future occurrence of that day/month, including
 * today. Year stated → used as-is, or rejected if that date is already past
 * — silently bumping a year the customer actually typed would book the
 * wrong event.
 */
export function parseEventDate(
  text: string,
  now: Date = new Date(),
): ParsedEventDate | null {
  const trimmed = text
    .trim()
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ');
  if (!trimmed) {
    return null;
  }

  const parsed = matchDateParts(trimmed);
  if (!parsed) {
    return null;
  }

  const resolved = resolveYear(parsed.day, parsed.month, parsed.year, now);
  if (!resolved) {
    return null;
  }

  return {
    iso: toIso(resolved.year, resolved.month, resolved.day),
    display: `${resolved.day} ${MONTH_NAMES[resolved.month]} ${resolved.year}`,
  };
}

function matchDateParts(
  text: string,
): { day: number; month: number; year: number | null } | null {
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return ints(Number(iso[3]), Number(iso[2]), Number(iso[1]));
  }

  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (dmy) {
    const year = dmy[3] ? expandYear(Number(dmy[3])) : null;
    return ints(Number(dmy[1]), Number(dmy[2]), year);
  }

  const dayMonth = text.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{4}))?$/,
  );
  if (dayMonth) {
    const month = MONTHS[dayMonth[2]];
    if (!month) {
      return null;
    }
    return ints(
      Number(dayMonth[1]),
      month,
      dayMonth[3] ? Number(dayMonth[3]) : null,
    );
  }

  const monthDay = text.match(
    /^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/,
  );
  if (monthDay) {
    const month = MONTHS[monthDay[1]];
    if (!month) {
      return null;
    }
    return ints(
      Number(monthDay[2]),
      month,
      monthDay[3] ? Number(monthDay[3]) : null,
    );
  }

  return null;
}

function ints(
  day: number,
  month: number,
  year: number | null,
): { day: number; month: number; year: number | null } | null {
  if (!Number.isInteger(day) || !Number.isInteger(month)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  if (year !== null && (year < 2000 || year > 2100)) {
    return null;
  }
  return { day, month, year };
}

function expandYear(year: number): number | null {
  if (year >= 1000) {
    return year;
  }
  if (year >= 0 && year < 100) {
    return 2000 + year;
  }
  return null;
}

function resolveYear(
  day: number,
  month: number,
  year: number | null,
  now: Date,
): { day: number; month: number; year: number } | null {
  if (year !== null) {
    if (!isRealDate(year, month, day)) {
      return null;
    }
    if (isBeforeToday(year, month, day, now)) {
      return null;
    }
    return { day, month, year };
  }

  const thisYear = now.getFullYear();
  if (
    isRealDate(thisYear, month, day) &&
    !isBeforeToday(thisYear, month, day, now)
  ) {
    return { day, month, year: thisYear };
  }
  if (isRealDate(thisYear + 1, month, day)) {
    return { day, month, year: thisYear + 1 };
  }
  return null;
}

function isRealDate(year: number, month: number, day: number): boolean {
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function isBeforeToday(
  year: number,
  month: number,
  day: number,
  now: Date,
): boolean {
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getTime() < today.getTime();
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
