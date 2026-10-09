import { ENQUIRY_STEPS } from './enquiry-steps';
import {
  enquiryReplyForStep,
  twilioListPickerVariables,
} from './enquiry-twilio-reply';

describe('enquiryReplyForStep', () => {
  it('attaches list-picker content variables from the first line of copy', () => {
    const reply = enquiryReplyForStep(
      ENQUIRY_STEPS.AWAITING_BUDGET,
      "What's the budget range for this? (6 of 6)\n1 Under KES 50,000",
    );
    expect(reply.twilioContent).toBe('budget');
    expect(reply.twilioContentVariables).toEqual({
      '1': "What's the budget range for this? (6 of 6)",
    });
  });

  it('strips markdown emphasis from list-picker variables', () => {
    expect(
      twilioListPickerVariables(
        ENQUIRY_STEPS.AWAITING_SERVICES,
        '*Pick services* (3 of 6)\n1 Sound',
      ),
    ).toEqual({ '1': 'Pick services (3 of 6)' });
  });
});
