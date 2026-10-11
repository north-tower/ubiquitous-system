import { ASK_EVENT_TYPE, GREETING } from './enquiry-copy';
import {
  enquiryBaileysListForStep,
  stripOptionListFromReply,
} from './enquiry-baileys-interactive';
import { EVENT_TYPE_OPTIONS } from './enquiry-options';
import { ENQUIRY_STEPS } from './enquiry-steps';

describe('enquiryBaileysListForStep', () => {
  it('builds an event-type list with option ids as rowId', () => {
    const list = enquiryBaileysListForStep(
      ENQUIRY_STEPS.AWAITING_EVENT_TYPE,
      GREETING,
    );
    expect(list?.kind).toBe('list');
    expect(list?.sections[0].rows.map((row) => row.rowId)).toEqual(
      EVENT_TYPE_OPTIONS.map((option) => option.id),
    );
    expect(list?.text).not.toMatch(/^\d+\s/m);
    expect(list?.text).toMatch(/Divine Budgets/i);
  });

  it('returns nothing for steps without Baileys interactivity yet', () => {
    expect(
      enquiryBaileysListForStep(ENQUIRY_STEPS.AWAITING_DATE, 'When?'),
    ).toBeUndefined();
  });
});

describe('stripOptionListFromReply', () => {
  it('removes the numbered block from ask copy', () => {
    const stripped = stripOptionListFromReply(ASK_EVENT_TYPE, EVENT_TYPE_OPTIONS);
    expect(stripped).toBe('What are you planning? (1 of 6)');
  });
});
