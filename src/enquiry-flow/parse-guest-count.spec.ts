import { parseGuestCount } from './parse-guest-count';

describe('parseGuestCount', () => {
  it('takes the upper bound of a range for capacity planning', () => {
    expect(parseGuestCount('400-1000')).toEqual({
      estimate: 1000,
      raw: '400-1000',
    });
  });

  it('keeps the original wording for "400 to 1000"', () => {
    expect(parseGuestCount('400 to 1000')).toEqual({
      estimate: 1000,
      raw: '400 to 1000',
    });
  });

  it('parses approximations without inventing a different number', () => {
    expect(parseGuestCount('around 500')).toEqual({
      estimate: 500,
      raw: 'around 500',
    });
    expect(parseGuestCount('500+')).toEqual({
      estimate: 500,
      raw: '500+',
    });
  });

  it('parses a plain number, including with commas', () => {
    expect(parseGuestCount('1,200')).toEqual({ estimate: 1200, raw: '1,200' });
  });

  it('parses small word numbers', () => {
    expect(parseGuestCount('a hundred')?.estimate).toBe(100);
    expect(parseGuestCount('two hundred')?.estimate).toBe(200);
  });

  it('returns null when nothing numeric is there', () => {
    expect(parseGuestCount('not sure yet')).toBeNull();
    expect(parseGuestCount('')).toBeNull();
  });
});
