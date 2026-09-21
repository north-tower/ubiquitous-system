const HANDOVER_PHRASES = [
  'agent',
  'human',
  'operator',
  'talk to the team',
  'talk to someone',
  'speak to the team',
  'speak to someone',
  'speak to a human',
  'real person',
  'call me',
  'please call me',
] as const;

/** Customer asked to leave the bot and speak to Divine Budget staff. */
export function matchHandoverCommand(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/[?!.]/g, '')
    .replace(/\s+/g, ' ');

  return (HANDOVER_PHRASES as readonly string[]).includes(normalized);
}
