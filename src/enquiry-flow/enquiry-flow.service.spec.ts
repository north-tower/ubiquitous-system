import { Conversation } from '../conversation/conversation.entity';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { DivineBudgetClient } from '../divine-budget/divine-budget.client';
import { DivineBudgetError } from '../divine-budget/divine-budget.types';
import { EnquiryFlowService } from './enquiry-flow.service';
import { EnquirySession } from './enquiry-session.entity';
import { EnquirySessionService } from './enquiry-session.service';
import { ENQUIRY_STEPS } from './enquiry-steps';
import type { EnquiryPayload } from './enquiry-payload';

class InMemorySessions {
  private rows: EnquirySession[] = [];

  reset(): void {
    this.rows = [];
  }

  active(): EnquirySession | undefined {
    return this.rows.filter((row) => !row.submittedAt).at(-1);
  }

  start(conversationId: string, step: string): Promise<EnquirySession> {
    const row = {
      id: `sess-${this.rows.length + 1}`,
      conversationId,
      currentStep: step,
      payload: {},
      createdAt: new Date(),
      submittedAt: null,
      reference: null,
    } as EnquirySession;
    this.rows.push(row);
    return Promise.resolve(row);
  }

  save(
    session: EnquirySession,
    next: { step: string; payload: EnquiryPayload },
  ): Promise<EnquirySession> {
    session.currentStep = next.step;
    session.payload = next.payload;
    return Promise.resolve(session);
  }

  markSubmitted(
    session: EnquirySession,
    reference: string,
  ): Promise<EnquirySession> {
    session.currentStep = ENQUIRY_STEPS.SUBMITTED;
    session.submittedAt = new Date();
    session.reference = reference;
    return Promise.resolve(session);
  }

  findActive(conversationId: string): Promise<EnquirySession | null> {
    return Promise.resolve(
      [...this.rows]
        .reverse()
        .find(
          (row) => row.conversationId === conversationId && !row.submittedAt,
        ) ?? null,
    );
  }

  findLatest(conversationId: string): Promise<EnquirySession | null> {
    return Promise.resolve(
      [...this.rows]
        .reverse()
        .find((row) => row.conversationId === conversationId) ?? null,
    );
  }

  closeOpen(conversationId: string): Promise<void> {
    for (const row of this.rows) {
      if (row.conversationId === conversationId && !row.submittedAt) {
        row.submittedAt = new Date();
      }
    }
    return Promise.resolve();
  }
}

describe('EnquiryFlowService', () => {
  const sessions = new InMemorySessions();
  const divineBudget = {
    isConfigured: jest.fn(() => true),
    submitEnquiry: jest.fn(),
  };
  const service = new EnquiryFlowService(
    sessions as unknown as EnquirySessionService,
    divineBudget as unknown as DivineBudgetClient,
  );
  const conversation = {
    id: 'conv-1',
    tenantId: 'tenant-1',
    prospectPhone: '254798229340',
    currentState: ConversationState.NEW,
    demoMode: null,
  } as Conversation;

  beforeEach(() => {
    sessions.reset();
    divineBudget.isConfigured.mockReturnValue(true);
    divineBudget.submitEnquiry.mockReset();
    divineBudget.submitEnquiry.mockResolvedValue({
      reference: 'REQ-AB12CD',
      enquiryId: 'enq-1',
    });
  });

  it('walks the mockup conversation and files the enquiry on confirm', async () => {
    await expect(say('hi')).resolves.toMatch(/What are you planning/i);
    await expect(say('Wedding')).resolves.toMatch(/When is it/i);
    await expect(say('20th December')).resolves.toMatch(/handle/i);
    await expect(say('Sound & PA')).resolves.toMatch(/how many guests/i);
    await expect(say('400-1000')).resolves.toMatch(/venue/i);
    await expect(say('Nakuru')).resolves.toMatch(
      /How would you like to proceed/i,
    );
    await expect(say('1')).resolves.toMatch(/What name should we use/i);
    await expect(say('Mike')).resolves.toMatch(/best phone number/i);
    const confirm = await say('1');
    expect(confirm).toMatch(/20 December 20\d{2}/);
    expect(confirm).toMatch(/Does that look right/i);

    const done = await say('1');
    expect(done).toMatch(/REQ-AB12CD/);
    expect(done).toMatch(/Thank you, Mike/);
    expect(divineBudget.submitEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: 'Mike',
        whatsappPhone: '+254798229340',
        eventType: 'Wedding',
        venue: 'Nakuru',
        guestEstimate: 1000,
        guestEstimateRaw: '400-1000',
        requestedServices: 'Sound & PA',
        wantsCallback: false,
        idempotencyKey: 'conv-1',
      }),
    );
  });

  it('flags a callback request when the customer wants to talk to the team', async () => {
    await say('hi');
    await say('1');
    await say('20th December');
    await say('1');
    await say('500');
    await say('Nakuru');
    await expect(say('2')).resolves.toMatch(/What name should we use/i);
    await say('Mike');
    await say('1');
    await say('1');

    expect(divineBudget.submitEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ wantsCallback: true }),
    );
  });

  it('re-asks when the date cannot be parsed', async () => {
    await say('hi');
    await say('1');
    await expect(say('soon-ish')).resolves.toMatch(/didn't catch a date/i);
    expect(sessions.active()?.currentStep).toBe(ENQUIRY_STEPS.AWAITING_DATE);
  });

  it('starts over from confirmation without filing', async () => {
    await say('hi');
    await say('1');
    await say('20th December');
    await say('1');
    await say('500');
    await say('Nakuru');
    await say('1');
    await say('Mike');
    await say('1');
    await expect(say('2')).resolves.toMatch(/What are you planning/i);
    expect(divineBudget.submitEnquiry).not.toHaveBeenCalled();
  });

  it('leaves the session unsubmitted when the API fails', async () => {
    divineBudget.submitEnquiry.mockRejectedValue(
      new DivineBudgetError('down', 500, true),
    );
    await walkToConfirm();
    await expect(say('1')).resolves.toMatch(/couldn't reach the team/i);
    expect(sessions.active()?.submittedAt).toBeNull();
    expect(sessions.active()?.currentStep).toBe(ENQUIRY_STEPS.AWAITING_CONFIRM);
  });

  it('does not claim the booking is confirmed', async () => {
    await walkToConfirm();
    const done = await say('1');
    expect(done.toLowerCase()).not.toMatch(/is confirmed/);
    expect(done.toLowerCase()).not.toMatch(/deposit/);
  });

  async function say(text: string): Promise<string> {
    const { replyText } = await service.handleInbound(conversation, text);
    return replyText;
  }

  async function walkToConfirm(): Promise<void> {
    await say('hi');
    await say('1');
    await say('20th December');
    await say('1');
    await say('500');
    await say('Nakuru');
    await say('1');
    await say('Mike');
    await say('1');
  }
});
