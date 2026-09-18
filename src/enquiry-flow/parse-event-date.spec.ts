import { parseEventDate } from './parse-event-date';

const SEP_2026 = new Date('2026-09-18T10:00:00+03:00');
const JAN_2027 = new Date('2027-01-15T10:00:00+03:00');
const DEC_21_2026 = new Date('2026-12-21T10:00:00+03:00');
const DEC_20_2026 = new Date('2026-12-20T10:00:00+03:00');

describe('parseEventDate', () => {
  it('resolves "20th December" to this year when that date is still ahead', () => {
    expect(parseEventDate('20th December', SEP_2026)).toEqual({
      iso: '2026-12-20',
      display: '20 December 2026',
    });
  });

  it('rolls into next year when that month/day has already passed', () => {
    expect(parseEventDate('20th December', JAN_2027)).toEqual({
      iso: '2027-12-20',
      display: '20 December 2027',
    });
  });

  it('rolls into next year the day after the date', () => {
    expect(parseEventDate('20 Dec', DEC_21_2026)).toEqual({
      iso: '2027-12-20',
      display: '20 December 2027',
    });
  });

  it('treats today as valid rather than pushing it a year out', () => {
    expect(parseEventDate('20th December', DEC_20_2026)?.iso).toBe(
      '2026-12-20',
    );
  });

  it('parses 20/12 without a year the same way', () => {
    expect(parseEventDate('20/12', SEP_2026)?.iso).toBe('2026-12-20');
  });

  it('parses 20/12/2026 with the stated year', () => {
    expect(parseEventDate('20/12/2026', SEP_2026)?.iso).toBe('2026-12-20');
  });

  it('parses December 20 and ISO dates', () => {
    expect(parseEventDate('December 20', SEP_2026)?.iso).toBe('2026-12-20');
    expect(parseEventDate('2026-12-20', SEP_2026)?.iso).toBe('2026-12-20');
  });

  it('rejects a stated year that is already past instead of silently bumping it', () => {
    expect(parseEventDate('20/12/2025', SEP_2026)).toBeNull();
  });

  it('rejects 31 February', () => {
    expect(parseEventDate('31 February 2027', SEP_2026)).toBeNull();
  });

  it('returns null for unparseable input', () => {
    expect(parseEventDate('sometime soon', SEP_2026)).toBeNull();
    expect(parseEventDate('', SEP_2026)).toBeNull();
  });
});
