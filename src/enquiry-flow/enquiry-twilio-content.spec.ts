import { ENQUIRY_STEPS } from './enquiry-steps';
import { ENQUIRY_TWILIO_CONTENT_BY_STEP } from './enquiry-twilio-content';

describe('ENQUIRY_TWILIO_CONTENT_BY_STEP', () => {
  it('covers every enquiry FSM step', () => {
    for (const step of Object.values(ENQUIRY_STEPS)) {
      expect(ENQUIRY_TWILIO_CONTENT_BY_STEP[step]).toBeDefined();
      expect(ENQUIRY_TWILIO_CONTENT_BY_STEP[step].step).toBe(step);
    }
  });

  it('marks wired interactive steps as implemented in code', () => {
    const implemented = Object.values(ENQUIRY_TWILIO_CONTENT_BY_STEP).filter(
      (row) => row.implemented,
    );
    expect(implemented.map((row) => row.step)).toEqual(
      expect.arrayContaining([
        ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE,
        ENQUIRY_STEPS.AWAITING_EVENT_TYPE,
        ENQUIRY_STEPS.AWAITING_SERVICES,
        ENQUIRY_STEPS.AWAITING_BUDGET,
        ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM,
        ENQUIRY_STEPS.AWAITING_PHONE,
        ENQUIRY_STEPS.AWAITING_EDIT_FIELD,
        ENQUIRY_STEPS.AWAITING_CONFIRM,
      ]),
    );
    expect(
      ENQUIRY_TWILIO_CONTENT_BY_STEP[ENQUIRY_STEPS.AWAITING_SERVICES].kind,
    ).toBe('list-picker');
  });
});
