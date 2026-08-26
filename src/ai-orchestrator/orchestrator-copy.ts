export const RESET_NEXT_BUSINESS =
  'Sure. What business should we simulate next?';

export const CLASSIFY_PROMPT =
  'Tell me what kind of business to simulate — for example a salon or a solar installer.';

export const VALUE_REVEAL_OFFER =
  'Want to see what this would look like for *your* actual business?';

export const VALUE_REVEAL_DECLINED =
  'No problem. Type *reset* if you want another simulated demo.';

export const MEETING_OFFERED_COPY =
  'Want to see what this would look like for your actual business booked in as a real demo call?';

export const MEETING_OFFERED_HOLD =
  "We'll follow up to book that demo call. Type *reset* if you want another simulated example in the meantime.";

export const ORCHESTRATOR_FALLBACK = [
  "I didn't catch that.",
  'Type *reset* to start over, or describe the business you want to simulate.',
].join(' ');

export const AI_CLASSIFY_FAILED = [
  'I had trouble classifying that just now.',
  'Describe the business again in your own words, or type *reset*.',
].join(' ');

export function noLiveDemoMessage(mode: string): string {
  return [
    `I mapped that to *${mode}*, but a live simulated demo for that industry is not wired yet.`,
    'Describe another business — for example a salon or a solar installer — or type *reset*.',
  ].join(' ');
}
