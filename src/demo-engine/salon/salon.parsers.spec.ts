import { matchSalonService, matchSalonSlot } from './salon.parsers';

describe('salon parsers', () => {
  it('matches braids from free text', () => {
    expect(matchSalonService('I want braids tomorrow')?.id).toBe('braids');
  });

  it('matches a slot by number or time label', () => {
    expect(matchSalonSlot('2')?.label).toBe('1:00 PM');
    expect(matchSalonSlot('10:30 AM')?.id).toBe('1');
  });

  it('returns null for an out-of-range slot number', () => {
    expect(matchSalonSlot('5')).toBeNull();
  });
});
