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

  it('keeps a numbered list on the event-type step instead of an interactive list', () => {
    const reply = enquiryReplyForStep(
      ENQUIRY_STEPS.AWAITING_EVENT_TYPE,
      'What are you planning? (1 of 6)\n1  Wedding\nReply with a number.',
    );
    expect(reply.twilioContent).toBe('eventType');
    expect(reply.baileysList).toBeUndefined();
    expect(reply.replyButtons).toBeUndefined();
    expect(reply.replyText).toContain('1  Wedding');
    expect(reply.replyText).toMatch(/Reply with a number/i);
  });

  it('attaches reply buttons on two-choice steps', () => {
    const reply = enquiryReplyForStep(
      ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM,
      'KES 20,000 is on the low side.\n1  Send it as is\n2  Adjust the budget',
    );
    expect(reply.replyButtons?.buttons.map((button) => button.id)).toEqual([
      'keep',
      'adjust',
    ]);
    expect(reply.baileysList).toBeUndefined();
    expect(reply.replyText).not.toMatch(/^\d+\s/m);
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
