/**
 * Normalizes a Kenyan number to E.164 (+2547XXXXXXXX / +2541XXXXXXXX).
 * Accepts local (07...), country-code-without-plus (2547...), and already
 * normalized (+2547...) forms. Returns null if the input cannot be a
 * Kenyan mobile/Safaricom-style number — better to re-ask than file a
 * callback number nobody can ring.
 */
export function parseKenyanPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) {
    return null;
  }

  let national: string | null = null;
  if (digits.startsWith('254') && digits.length === 12) {
    national = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    national = digits.slice(1);
  } else if (
    digits.length === 9 &&
    (digits.startsWith('7') || digits.startsWith('1'))
  ) {
    national = digits;
  }

  if (!national || national.length !== 9 || !/^[17]/.test(national)) {
    return null;
  }

  return `+254${national}`;
}

/** 0798 229 340 — easier to read back in chat than +254798229340. */
export function formatKenyanPhoneDisplay(normalized: string): string {
  const match = /^\+254(\d{3})(\d{3})(\d{3})$/.exec(normalized);
  if (!match) {
    return normalized;
  }
  return `0${match[1]} ${match[2]} ${match[3]}`;
}
