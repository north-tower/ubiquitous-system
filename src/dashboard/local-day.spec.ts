import { startOfDayInTimeZone } from './local-day';

describe('startOfDayInTimeZone', () => {
  it('returns UTC midnight in UTC', () => {
    const now = new Date('2026-08-26T15:30:00.000Z');
    expect(startOfDayInTimeZone(now, 'UTC').toISOString()).toBe(
      '2026-08-26T00:00:00.000Z',
    );
  });

  it('returns East Africa midnight as the previous evening in UTC', () => {
    const now = new Date('2026-08-26T01:00:00.000Z');
    expect(startOfDayInTimeZone(now, 'Africa/Nairobi').toISOString()).toBe(
      '2026-08-25T21:00:00.000Z',
    );
  });
});
