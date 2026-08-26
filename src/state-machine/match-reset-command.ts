const RESET_PHRASES = [
  'reset',
  'another business',
  'show another example',
  'exit demo',
] as const;

export function matchResetCommand(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  return (RESET_PHRASES as readonly string[]).includes(normalized);
}
