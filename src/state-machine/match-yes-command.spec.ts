import { matchNoCommand, matchYesCommand } from './match-yes-command';

describe('matchYesCommand', () => {
  it.each(['yes', 'YES', 'yeah', 'yes please', 'sure', 'ok'])(
    'recognizes %j',
    (text) => {
      expect(matchYesCommand(text)).toBe(true);
    },
  );

  it('rejects unrelated text', () => {
    expect(matchYesCommand('braids')).toBe(false);
    expect(matchYesCommand('')).toBe(false);
  });
});

describe('matchNoCommand', () => {
  it.each(['no', 'nope', 'not now'])('recognizes %j', (text) => {
    expect(matchNoCommand(text)).toBe(true);
  });

  it('does not treat yes as no', () => {
    expect(matchNoCommand('yes')).toBe(false);
  });
});
