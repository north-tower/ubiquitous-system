const GREETING_OR_FILLER = new Set([
  'hi',
  'hii',
  'hiii',
  'hey',
  'helo',
  'hello',
  'yo',
  'sup',
  'hola',
  'habari',
  'jambo',
  'mambo',
  'sasa',
  'niaje',
  'salama',
  'morning',
  'evening',
  'afternoon',
  'good morning',
  'good evening',
  'ok',
  'okay',
  'k',
  'kk',
  'yes',
  'yeah',
  'yep',
  'no',
  'nope',
  'skip',
  'none',
  'test',
  'testing',
  'name',
  'me',
  'myself',
  'customer',
  'user',
  'agent',
  'please',
  'thanks',
  'thank you',
]);

/**
 * True when the reply looks like a real person we can put on an enquiry.
 * WhatsApp profile names and first-message greetings ("hi", "hey", a phone
 * number, emoji) fail this — those must not be filed as contactName.
 */
export function isLikelyPersonName(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length < 2 || trimmed.length > 80) {
    return false;
  }
  if (GREETING_OR_FILLER.has(trimmed.toLowerCase())) {
    return false;
  }
  if (trimmed.startsWith('~')) {
    return false;
  }
  if (/\d{6,}/.test(trimmed)) {
    return false;
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return false;
  }
  if (!/^[a-zA-Z][a-zA-Z\s'.-]*$/.test(trimmed)) {
    return false;
  }
  const words = trimmed.split(/\s+/);
  return words.length >= 1 && words.length <= 5;
}
