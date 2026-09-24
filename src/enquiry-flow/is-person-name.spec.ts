import { isLikelyPersonName } from './is-person-name';

describe('isLikelyPersonName', () => {
  it('accepts ordinary Kenyan names', () => {
    expect(isLikelyPersonName('Mike')).toBe(true);
    expect(isLikelyPersonName('Mike Otieno')).toBe(true);
    expect(isLikelyPersonName("O'Connor")).toBe(true);
    expect(isLikelyPersonName('Mary-Ann')).toBe(true);
  });

  it('rejects greetings and filler that used to become the stored name', () => {
    expect(isLikelyPersonName('hi')).toBe(false);
    expect(isLikelyPersonName('Hi')).toBe(false);
    expect(isLikelyPersonName('hey')).toBe(false);
    expect(isLikelyPersonName('ok')).toBe(false);
    expect(isLikelyPersonName('test')).toBe(false);
    expect(isLikelyPersonName('mambo')).toBe(false);
  });

  it('rejects numbers, emoji, and WhatsApp default-style names', () => {
    expect(isLikelyPersonName('254798229340')).toBe(false);
    expect(isLikelyPersonName('~ hi')).toBe(false);
    expect(isLikelyPersonName('🎉')).toBe(false);
    expect(isLikelyPersonName('')).toBe(false);
  });
});
