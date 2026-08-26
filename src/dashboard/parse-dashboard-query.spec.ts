import { parseLeadScoreQuery, parsePageQuery } from './parse-dashboard-query';

describe('parse dashboard query', () => {
  it('accepts HOT WARM COLD and rejects other lead scores', () => {
    expect(parseLeadScoreQuery(undefined)).toBeUndefined();
    expect(parseLeadScoreQuery('HOT')).toBe('HOT');
    expect(() => parseLeadScoreQuery('LUKEWARM')).toThrow(
      'leadScore must be HOT, WARM, or COLD',
    );
  });

  it('requires a positive page', () => {
    expect(parsePageQuery(undefined, 1)).toBe(1);
    expect(parsePageQuery('3', 1)).toBe(3);
    expect(() => parsePageQuery('0', 1)).toThrow(
      'page must be a positive integer',
    );
  });
});
