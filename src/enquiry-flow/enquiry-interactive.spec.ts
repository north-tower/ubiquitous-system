import { ASK_EDIT_FIELD, confirmationPlayback } from './enquiry-copy';
import { enquiryButtonsForStep } from './enquiry-interactive';
import { CONFIRM_OPTIONS, RETURNING_OPTIONS } from './enquiry-options';
import { ENQUIRY_STEPS } from './enquiry-steps';
import { formatNumberedOptions } from './match-numbered-option';

describe('enquiryButtonsForStep', () => {
  it('builds two returning-choice buttons and keeps numbers in the fallback', () => {
    const replyText = [
      'we already have your enquiry *REQ-1*.',
      '',
      formatNumberedOptions(RETURNING_OPTIONS),
    ].join('\n');
    const buttons = enquiryButtonsForStep(
      ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE,
      replyText,
    );
    expect(buttons?.buttons.map((button) => button.id)).toEqual(['wait', 'new']);
    expect(buttons?.text).not.toMatch(/^\d+\s/m);
    expect(buttons?.fallbackText).toContain('1  Wait for the team');
  });

  it('builds confirm buttons from the summary playback', () => {
    const buttons = enquiryButtonsForStep(
      ENQUIRY_STEPS.AWAITING_CONFIRM,
      confirmationPlayback({ eventType: 'Wedding' }),
    );
    expect(buttons?.buttons.map((button) => button.title)).toEqual([
      'Yes, send it',
      'Edit something',
    ]);
    expect(buttons?.text).toContain('Does that look right?');
    expect(buttons?.text).not.toContain(formatNumberedOptions(CONFIRM_OPTIONS));
  });

  it('builds a single phone button', () => {
    const buttons = enquiryButtonsForStep(
      ENQUIRY_STEPS.AWAITING_PHONE,
      "Reply *1* to use 0798 229 340, or type a different one.",
    );
    expect(buttons?.buttons).toEqual([
      { id: 'use_whatsapp', title: 'Use this number' },
    ]);
  });

  it('skips steps with more than three options', () => {
    expect(
      enquiryButtonsForStep(ENQUIRY_STEPS.AWAITING_EDIT_FIELD, ASK_EDIT_FIELD),
    ).toBeUndefined();
  });
});
