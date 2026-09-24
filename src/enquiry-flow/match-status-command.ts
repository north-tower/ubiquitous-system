const STATUS_PHRASES = [
  'status',
  'my status',
  'enquiry status',
  'request status',
  'where is my enquiry',
  'where is my request',
  'check status',
] as const;

/** Customer asked where an already-filed enquiry stands. */
export function matchStatusCommand(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/[?!.]/g, '')
    .replace(/\s+/g, ' ');

  return (STATUS_PHRASES as readonly string[]).includes(normalized);
}
