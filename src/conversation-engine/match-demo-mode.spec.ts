import { matchDemoMode } from './match-demo-mode';

describe('matchDemoMode', () => {
  it('detects salon and solar keywords', () => {
    expect(matchDemoMode('salon')).toBe('salon');
    expect(matchDemoMode('Try the salon demo')).toBe('salon');
    expect(matchDemoMode('solar')).toBe('solar');
    expect(matchDemoMode('SOLAR please')).toBe('solar');
  });

  it('returns null for unrelated text', () => {
    expect(matchDemoMode('hello')).toBeNull();
    expect(matchDemoMode('braids')).toBeNull();
  });
});
