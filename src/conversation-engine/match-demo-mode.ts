export type GuidedDemoMode = 'salon' | 'solar';

export function matchDemoMode(text: string): GuidedDemoMode | null {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (/\bsalon\b/.test(normalized)) {
    return 'salon';
  }
  if (/\bsolar\b/.test(normalized)) {
    return 'solar';
  }
  return null;
}
