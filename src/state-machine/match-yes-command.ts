function normalize(text: string): string {
  return text
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/[?!.]/g, '')
    .replace(/\s+/g, ' ');
}

const YES_EXACT = [
  'yes',
  'y',
  'yeah',
  'yep',
  'yup',
  'sure',
  'ok',
  'okay',
  'please',
  'go ahead',
  'sounds good',
  'lets do it',
  "let's do it",
  'yes please',
] as const;

const NO_EXACT = [
  'no',
  'n',
  'nope',
  'nah',
  'not now',
  'later',
  'no thanks',
  'not really',
] as const;

export function matchYesCommand(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) {
    return false;
  }
  if ((YES_EXACT as readonly string[]).includes(normalized)) {
    return true;
  }
  return normalized.startsWith('yes ') || normalized.startsWith('yeah ');
}

export function matchNoCommand(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) {
    return false;
  }
  return (NO_EXACT as readonly string[]).includes(normalized);
}
