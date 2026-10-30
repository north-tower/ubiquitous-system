import { matchResetCommand } from '../state-machine/match-reset-command';

const RESTART_WORDS = new Set(['hi', 'hello', 'menu', 'start']);

/** Exact restart words for the HMG flow, plus the shared reset phrases. */
export function isHmgRestart(text: string): boolean {
  if (matchResetCommand(text)) {
    return true;
  }
  const normalized = text
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/[!?.]+$/g, '')
    .replace(/\s+/g, ' ');
  return RESTART_WORDS.has(normalized);
}
