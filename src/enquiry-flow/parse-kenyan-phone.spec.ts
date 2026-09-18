import {
  formatKenyanPhoneDisplay,
  parseKenyanPhone,
} from './parse-kenyan-phone';

describe('parseKenyanPhone', () => {
  it('accepts a local 07 number', () => {
    expect(parseKenyanPhone('0798229340')).toBe('+254798229340');
  });

  it('accepts +254 and 254 prefixes', () => {
    expect(parseKenyanPhone('+254798229340')).toBe('+254798229340');
    expect(parseKenyanPhone('254798229340')).toBe('+254798229340');
  });

  it('accepts a 9-digit national number', () => {
    expect(parseKenyanPhone('798229340')).toBe('+254798229340');
  });

  it('strips spaces and dashes', () => {
    expect(parseKenyanPhone('0798 229 340')).toBe('+254798229340');
    expect(parseKenyanPhone('0798-229-340')).toBe('+254798229340');
  });

  it('rejects a number that cannot be Kenyan', () => {
    expect(parseKenyanPhone('12345')).toBeNull();
    expect(parseKenyanPhone('not a phone')).toBeNull();
    expect(parseKenyanPhone('+441234567890')).toBeNull();
  });
});

describe('formatKenyanPhoneDisplay', () => {
  it('renders a local grouped number', () => {
    expect(formatKenyanPhoneDisplay('+254798229340')).toBe('0798 229 340');
  });
});
