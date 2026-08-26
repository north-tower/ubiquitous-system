import { parseCount } from './parse-count';

describe('parseCount', () => {
  it('parses "about 50 a day"', () => {
    expect(parseCount('about 50 a day')).toBe(50);
  });

  it('parses "~70/day"', () => {
    expect(parseCount('~70/day')).toBe(70);
  });

  it('parses a plain "40"', () => {
    expect(parseCount('40')).toBe(40);
  });

  it('returns null when there is no number', () => {
    expect(parseCount('a handful')).toBeNull();
  });
});
