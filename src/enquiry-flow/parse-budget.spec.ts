import { budgetLooksLow, formatKes, parseBudget } from './parse-budget';

describe('parseBudget', () => {
  it('normalizes a bare figure to KES with grouping', () => {
    expect(parseBudget('23000')).toEqual({
      display: 'KES 23,000',
      amountKes: 23_000,
    });
  });

  it('reads Kenyan k shorthand and currency prefixes', () => {
    expect(parseBudget('80k')?.amountKes).toBe(80_000);
    expect(parseBudget('KES 80,000')?.display).toBe('KES 80,000');
    expect(parseBudget('23k')?.display).toBe('KES 23,000');
  });

  it('keeps a range as a range and uses the floor for the low check', () => {
    expect(parseBudget('50-100k')).toEqual({
      display: 'KES 50,000–100,000',
      amountKes: 50_000,
    });
  });

  it('returns null when nothing money-like is there', () => {
    expect(parseBudget('not sure')).toBeNull();
    expect(parseBudget('')).toBeNull();
  });
});

describe('formatKes', () => {
  it('groups thousands the way staff read them', () => {
    expect(formatKes(23000)).toBe('KES 23,000');
  });
});

describe('budgetLooksLow', () => {
  it('flags 23k for a full package of 600 guests', () => {
    expect(
      budgetLooksLow({
        amountKes: 23_000,
        guests: 600,
        services: 'Full package',
      }),
    ).toBe(true);
  });

  it('does not flag a 300k band for the same size', () => {
    expect(
      budgetLooksLow({
        amountKes: 300_000,
        guests: 600,
        services: 'Full package',
      }),
    ).toBe(false);
  });

  it('does not flag when guests or amount are missing', () => {
    expect(budgetLooksLow({ amountKes: 23_000 })).toBe(false);
    expect(budgetLooksLow({ amountKes: null, guests: 600 })).toBe(false);
  });
});
