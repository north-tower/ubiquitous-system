export const INDUSTRY_MODES = [
  'salon',
  'solar',
  'furniture',
  'insurance',
  'hotel',
  'clinic',
  'retail',
  'real_estate',
  'generic',
] as const;

export type IndustryMode = (typeof INDUSTRY_MODES)[number];

export const LIVE_DEMO_MODES = ['salon', 'solar'] as const;

export type LiveDemoMode = (typeof LIVE_DEMO_MODES)[number];

export function isIndustryMode(value: string): value is IndustryMode {
  return (INDUSTRY_MODES as readonly string[]).includes(value);
}

export function isLiveDemoMode(value: string): value is LiveDemoMode {
  return (LIVE_DEMO_MODES as readonly string[]).includes(value);
}
