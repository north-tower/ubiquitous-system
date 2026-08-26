export const DEMO_DISCLAIMER =
  '*Simulated demo — not a real Techfind offer, booking, or quote.*';

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

export function renderValueRevealMessage(params: {
  demoKind: string;
  bullets: string[];
}): string {
  const bullets = params.bullets.map((line, index) => `${index + 1}. ${line}`);
  return [
    DEMO_DISCLAIMER,
    '',
    `Here's what just happened behind the scenes in this ${params.demoKind}:`,
    ...bullets,
    '',
    'All prices, inventory, and availability were sample demo data. Techfind did not book, sell, or quote anything for real.',
  ].join('\n');
}

export function withDisclaimer(
  body: string,
  options?: { trailing?: boolean },
): string {
  if (options?.trailing) {
    return `${body}\n\n${DEMO_DISCLAIMER}`;
  }
  return `${DEMO_DISCLAIMER}\n\n${body}`;
}
