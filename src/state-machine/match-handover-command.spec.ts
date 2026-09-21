import { matchHandoverCommand } from './match-handover-command';

describe('matchHandoverCommand', () => {
  it.each([
    ['agent'],
    ['AGENT'],
    ['  Human  '],
    ['talk to the team'],
    ['Speak to someone'],
    ['/agent'],
    ['call me'],
  ])('recognizes %j', (text) => {
    expect(matchHandoverCommand(text)).toBe(true);
  });

  it('does not treat ordinary enquiry answers as a handover', () => {
    expect(matchHandoverCommand('Wedding')).toBe(false);
    expect(matchHandoverCommand('1')).toBe(false);
    expect(matchHandoverCommand('help with sound')).toBe(false);
    expect(matchHandoverCommand('')).toBe(false);
  });
});
