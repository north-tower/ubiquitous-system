export function tzOffsetMs(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const num = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    num('year'),
    num('month') - 1,
    num('day'),
    num('hour'),
    num('minute'),
    num('second'),
  );
  return asUtc - instant.getTime();
}

export function startOfDayInTimeZone(now: Date, timeZone: string): Date {
  const offset = tzOffsetMs(timeZone, now);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const num = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return new Date(
    Date.UTC(num('year'), num('month') - 1, num('day'), 0, 0, 0) - offset,
  );
}
