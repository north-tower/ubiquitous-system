import { combineVenue, parseVenue, titleCasePlace } from './parse-venue';

describe('titleCasePlace', () => {
  it('capitalizes a town', () => {
    expect(titleCasePlace('nakuru')).toBe('Nakuru');
  });

  it('keeps short brand tokens uppercase', () => {
    expect(titleCasePlace('abc gardens')).toBe('ABC Gardens');
  });
});

describe('parseVenue', () => {
  it('treats a bare town as needing a site name', () => {
    expect(parseVenue('nakuru')).toEqual({
      display: 'Nakuru',
      town: 'Nakuru',
      needsSite: true,
    });
  });

  it('splits town and site on a comma', () => {
    expect(parseVenue('nakuru, abc gardens')).toEqual({
      display: 'ABC Gardens, Nakuru',
      town: 'Nakuru',
      site: 'ABC Gardens',
      needsSite: false,
    });
  });

  it('splits "at" as site then town', () => {
    expect(parseVenue('abc gardens at nakuru')).toEqual({
      display: 'ABC Gardens, Nakuru',
      town: 'Nakuru',
      site: 'ABC Gardens',
      needsSite: false,
    });
  });

  it('does not ask again when they already named a hall', () => {
    expect(parseVenue('st marys church')).toMatchObject({
      needsSite: false,
    });
  });
});

describe('combineVenue', () => {
  it('puts the site first so staff read the working address', () => {
    expect(combineVenue('Nakuru', 'ABC Gardens')).toBe('ABC Gardens, Nakuru');
    expect(combineVenue('Nakuru', undefined)).toBe('Nakuru');
  });
});
