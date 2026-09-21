import {
  formatNumberedOptions,
  matchNumberedOption,
  matchNumberedOptions,
  type NumberedOption,
} from './match-numbered-option';

const OPTIONS: NumberedOption[] = [
  { id: 'wedding', label: 'Wedding', aliases: ['weddings'] },
  {
    id: 'corporate',
    label: 'Corporate event',
    aliases: ['corporate', 'company', 'office'],
  },
  { id: 'birthday', label: 'Birthday', aliases: ['bday'] },
];

describe('matchNumberedOption', () => {
  it('matches a bare number, with or without a trailing dot', () => {
    expect(matchNumberedOption('2', OPTIONS)?.id).toBe('corporate');
    expect(matchNumberedOption('2.', OPTIONS)?.id).toBe('corporate');
  });

  it('matches the label regardless of case', () => {
    expect(matchNumberedOption('wedding', OPTIONS)?.id).toBe('wedding');
    expect(matchNumberedOption('a Wedding', OPTIONS)?.id).toBe('wedding');
  });

  it('prefers the longer alias so "corporate event" is not eaten by a shorter word', () => {
    expect(matchNumberedOption('corporate event', OPTIONS)?.id).toBe(
      'corporate',
    );
  });

  it('returns null for a number off the list, and for empty text', () => {
    expect(matchNumberedOption('9', OPTIONS)).toBeNull();
    expect(matchNumberedOption('', OPTIONS)).toBeNull();
  });

  it('does not treat "20th December" as option 20', () => {
    expect(matchNumberedOption('20th December', OPTIONS)).toBeNull();
  });
});

describe('matchNumberedOptions', () => {
  it('returns a single match as a one-item list', () => {
    expect(
      matchNumberedOptions('wedding', OPTIONS)?.map((row) => row.id),
    ).toEqual(['wedding']);
  });

  it('accepts several list numbers', () => {
    expect(
      matchNumberedOptions('1, 3', OPTIONS)?.map((row) => row.id),
    ).toEqual(['wedding', 'birthday']);
    expect(
      matchNumberedOptions('1 and 2', OPTIONS)?.map((row) => row.id),
    ).toEqual(['wedding', 'corporate']);
  });

  it('matches more than one label in the same reply', () => {
    expect(
      matchNumberedOptions('wedding and birthday', OPTIONS)?.map(
        (row) => row.id,
      ),
    ).toEqual(['wedding', 'birthday']);
  });

  it('returns null for an empty reply', () => {
    expect(matchNumberedOptions('', OPTIONS)).toBeNull();
  });
});

describe('formatNumberedOptions', () => {
  it('prints one numbered line per option', () => {
    expect(formatNumberedOptions(OPTIONS)).toBe(
      ['1  Wedding', '2  Corporate event', '3  Birthday'].join('\n'),
    );
  });
});
