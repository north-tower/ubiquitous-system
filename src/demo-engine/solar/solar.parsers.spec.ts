import { parseKesAmount } from './solar.parsers';
import { recommendSolarTier } from './solar.fixture';

describe('solar parsers', () => {
  it('parses "around 35k" as 35000', () => {
    expect(parseKesAmount('around 35k')).toBe(35000);
  });

  it('parses "KES 40,000" as 40000', () => {
    expect(parseKesAmount('KES 40,000')).toBe(40000);
  });
});

describe('recommendSolarTier', () => {
  it('maps 35000 to the standard simulated tier', () => {
    expect(recommendSolarTier(35000).id).toBe('standard');
  });

  it('maps 40000 to the high-usage simulated tier', () => {
    expect(recommendSolarTier(40000).id).toBe('high_usage');
  });
});
