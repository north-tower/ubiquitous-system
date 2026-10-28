import { formatEnquiryStorySoFar } from './enquiry-story';

describe('formatEnquiryStorySoFar', () => {
  it('lists only fields that are already captured', () => {
    const story = formatEnquiryStorySoFar({
      eventType: 'Wedding',
      eventDateDisplay: '20 Dec 2026',
      requestedServices: 'Sound & PA, Lighting',
    });
    expect(story).toContain('*So far:*');
    expect(story).toContain('Event — *Wedding*');
    expect(story).toContain('Date — *20 Dec 2026*');
    expect(story).toContain('Services — *Sound & PA, Lighting*');
    expect(story).not.toMatch(/Guests —/);
    expect(story).not.toMatch(/Budget —/);
  });

  it('returns empty when nothing captured yet', () => {
    expect(formatEnquiryStorySoFar({})).toBe('');
  });
});
