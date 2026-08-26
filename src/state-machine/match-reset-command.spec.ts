import { ConversationState } from './conversation-state.enum';
import { matchResetCommand } from './match-reset-command';

describe('matchResetCommand', () => {
  it.each([
    ['reset'],
    ['RESET'],
    ['  Reset  '],
    ['another business'],
    ['Another   Business'],
    ['show another example'],
    ['SHOW ANOTHER EXAMPLE'],
    ['exit demo'],
    ['  exit   demo  '],
    ['/reset'],
    ['/exit demo'],
  ])('recognizes %j', (text) => {
    expect(matchResetCommand(text)).toBe(true);
  });

  it('rejects an unrelated booking message', () => {
    expect(matchResetCommand('can I book braids tomorrow')).toBe(false);
  });

  it('rejects empty or unrelated text', () => {
    expect(matchResetCommand('')).toBe(false);
    expect(matchResetCommand('hello')).toBe(false);
    expect(matchResetCommand(ConversationState.NEW)).toBe(false);
  });
});
