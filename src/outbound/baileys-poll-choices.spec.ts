import {
  buildPollValuesFromChoices,
  pollSelectionToOptionId,
} from './baileys-poll-choices';

const choices = [
  { id: 'wedding', label: 'Wedding' },
  { id: 'corporate', label: 'Corporate event' },
];

describe('baileys poll choices', () => {
  it('maps poll labels back to option ids', () => {
    expect(pollSelectionToOptionId('Wedding', choices)).toBe('wedding');
    expect(pollSelectionToOptionId('corporate', choices)).toBe('corporate');
  });

  it('builds poll option labels for sendMessage', () => {
    expect(buildPollValuesFromChoices(choices)).toEqual([
      'Wedding',
      'Corporate event',
    ]);
  });
});
