import { ENQUIRY_STEPS } from '../enquiry-flow/enquiry-steps';
import {
  ENQUIRY_PROGRESS,
  enquirySessionProgress,
  isFiledEnquiry,
  latestByConversationId,
} from './funnel-stages';

describe('enquirySessionProgress', () => {
  it('treats a filed enquiry as submitted even if the step was closed mid-flow', () => {
    expect(
      enquirySessionProgress({
        currentStep: ENQUIRY_STEPS.AWAITING_DATE,
        reference: 'REQ-100',
        payload: { eventType: 'Wedding' },
      }),
    ).toBe(ENQUIRY_PROGRESS.submitted);
    expect(
      isFiledEnquiry({
        currentStep: ENQUIRY_STEPS.AWAITING_DATE,
        reference: 'REQ-100',
      }),
    ).toBe(true);
  });

  it('does not treat a reset/abandoned session as filed', () => {
    expect(
      isFiledEnquiry({
        currentStep: ENQUIRY_STEPS.AWAITING_VENUE,
        reference: null,
      }),
    ).toBe(false);
  });

  it('keeps confirm-loop edits at ready-to-confirm', () => {
    expect(
      enquirySessionProgress({
        currentStep: ENQUIRY_STEPS.AWAITING_DATE,
        reference: null,
        payload: { returnToConfirm: true, eventType: 'Wedding' },
      }),
    ).toBe(ENQUIRY_PROGRESS.confirm);
  });

  it('uses captured event fields so a mid-flow handover is not over-counted', () => {
    expect(
      enquirySessionProgress({
        currentStep: ENQUIRY_STEPS.AWAITING_HANDOVER_NAME,
        reference: null,
        payload: { eventType: 'Wedding', eventDate: '2026-10-01' },
      }),
    ).toBe(ENQUIRY_PROGRESS.date);
  });

  it('advances when the current step is past the last captured field', () => {
    expect(
      enquirySessionProgress({
        currentStep: ENQUIRY_STEPS.AWAITING_DETAILS,
        reference: null,
        payload: {
          eventType: 'Wedding',
          eventDate: '2026-10-01',
          requestedServices: 'Sound',
          guestEstimate: 80,
          venue: 'Karen',
        },
      }),
    ).toBe(ENQUIRY_PROGRESS.budget);
  });
});

describe('latestByConversationId', () => {
  it('keeps the newest session per conversation', () => {
    const latest = latestByConversationId([
      {
        conversationId: 'c1',
        createdAt: new Date('2026-09-01T10:00:00.000Z'),
        id: 'old',
      },
      {
        conversationId: 'c1',
        createdAt: new Date('2026-09-01T11:00:00.000Z'),
        id: 'new',
      },
      {
        conversationId: 'c2',
        createdAt: new Date('2026-09-01T09:00:00.000Z'),
        id: 'only',
      },
    ]);

    expect(latest.get('c1')?.id).toBe('new');
    expect(latest.get('c2')?.id).toBe('only');
  });
});
