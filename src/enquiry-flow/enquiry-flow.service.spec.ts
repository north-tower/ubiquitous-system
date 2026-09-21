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

  start(
    conversationId: string,
    step: string,
    payload: EnquiryPayload = {},
  ): Promise<EnquirySession> {
    const row = {
      id: `sess-${this.rows.length + 1}`,
      conversationId,
      currentStep: step,
      payload,
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
    lookupContact: jest.fn(),
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
    divineBudget.lookupContact.mockReset();
    divineBudget.lookupContact.mockResolvedValue(null);
    divineBudget.submitEnquiry.mockResolvedValue({
      reference: 'REQ-AB12CD',
      enquiryId: 'enq-1',
    });
  });

  it('walks the enquiry conversation and files it on confirm', async () => {
    await expect(say('hi')).resolves.toMatch(/What are you planning/i);
    await expect(say('Wedding')).resolves.toMatch(/When is it/i);
    await expect(say('20th December')).resolves.toMatch(/handle/i);
    await expect(say('1, 2')).resolves.toMatch(/how many guests/i);
    await expect(say('400-1000')).resolves.toMatch(/venue/i);
    await expect(say('Nakuru')).resolves.toMatch(/budget/i);
    await expect(say('50-100k')).resolves.toMatch(/Anything else/i);
    await expect(say('Need a generator')).resolves.toMatch(
      /What name should we use/i,
    );
    await expect(say('Mike')).resolves.toMatch(/best phone number/i);
    const confirm = await say('1');
    expect(confirm).toMatch(/20 December 20\d{2}/);
    expect(confirm).toMatch(/Sound & PA, Lighting/);
    expect(confirm).toMatch(/50-100k/);
    expect(confirm).toMatch(/Need a generator/);
    expect(confirm).toMatch(/Does that look right/i);

    const done = await say('1');
    expect(done).toMatch(/REQ-AB12CD/);
    expect(done).toMatch(/Thank you, Mike/);
    expect(done).toMatch(/review the details and respond/i);
    expect(divineBudget.submitEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: 'Mike',
        whatsappPhone: '+254798229340',
        eventType: 'Wedding',
        venue: 'Nakuru',
        guestEstimate: 1000,
        guestEstimateRaw: '400-1000',
        requestedServices: 'Sound & PA, Lighting',
        notes: 'Need a generator',
        budgetRange: '50-100k',
        wantsCallback: false,
        idempotencyKey: 'sess-1',
      }),
    );
  });

  it('lets the customer talk to the team from any step', async () => {
    await say('hi');
    await say('1');
    await expect(say('agent')).resolves.toMatch(
      /What name should they look for/i,
    );
    const done = await say('Mike');
    expect(done).toMatch(/REQ-AB12CD/);
    expect(divineBudget.submitEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        contactName: 'Mike',
        wantsCallback: true,
        eventType: 'Wedding',
        idempotencyKey: 'sess-1',
      }),
    );
  });

  it('re-asks when the date cannot be parsed', async () => {
    await say('hi');
    await say('1');
    await expect(say('soon-ish')).resolves.toMatch(/didn't catch a date/i);
    expect(sessions.active()?.currentStep).toBe(ENQUIRY_STEPS.AWAITING_DATE);
  });

  it('starts over from confirmation without filing', async () => {
    await walkToConfirm();
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

  it('does not confirm a booking, availability, or any payment', async () => {
    await walkToConfirm();
    const done = await say('1');
    expect(done.toLowerCase()).not.toMatch(/is confirmed/);
    expect(done.toLowerCase()).not.toMatch(/availability/);
    expect(done.toLowerCase()).not.toMatch(/deposit/);
    expect(done.toLowerCase()).not.toMatch(/m-pesa|kcb/);
    expect(done.toLowerCase()).not.toMatch(/booking enquiry received/);
  });

  it('holds after filing until they reset, then keys the next enquiry on a new session', async () => {
    await walkToConfirm();
    await say('1');
    await expect(say('hi')).resolves.toMatch(/REQ-AB12CD/);
    await expect(say('reset')).resolves.toMatch(/Welcome back, Mike/);
    await say('1');
    await say('20th December');
    await say('1');
    await say('500');
    await say('Nakuru');
    await say('skip');
    const confirm = await say('skip');
    expect(confirm).toMatch(/Name: Mike/);
    await say('1');
    expect(divineBudget.submitEnquiry).toHaveBeenLastCalledWith(
      expect.objectContaining({ idempotencyKey: 'sess-2' }),
    );
  });

  it('greets a known customer instead of starting as a stranger', async () => {
    divineBudget.lookupContact.mockResolvedValue({
      known: true,
      firstName: 'Mike',
      contactName: 'Mike Otieno',
      isCustomer: true,
      openEnquiry: null,
      upcomingEvent: null,
    });
    await expect(say('hi')).resolves.toMatch(/Welcome back, Mike/);
  });

  it('offers a choice when they already have an open enquiry', async () => {
    divineBudget.lookupContact.mockResolvedValue({
      known: true,
      firstName: 'Mike',
      contactName: 'Mike Otieno',
      isCustomer: false,
      openEnquiry: {
        reference: 'REQ-OPEN1',
        status: 'CONTACTED',
        eventType: 'Wedding',
      },
      upcomingEvent: null,
    });
    await expect(say('hi')).resolves.toMatch(/REQ-OPEN1/);
    await expect(say('1')).resolves.toMatch(/still has \*REQ-OPEN1\*/);
    expect(divineBudget.submitEnquiry).not.toHaveBeenCalled();
  });

  it('skips name and phone when a returning customer starts a new event', async () => {
    divineBudget.lookupContact.mockResolvedValue({
      known: true,
      firstName: 'Mike',
      contactName: 'Mike Otieno',
      isCustomer: true,
      openEnquiry: {
        reference: 'REQ-OPEN1',
        status: 'ASSIGNED',
        eventType: 'Wedding',
      },
      upcomingEvent: null,
    });
    await say('hi');
    await expect(say('2')).resolves.toMatch(/Welcome back, Mike/);
    await say('1');
    await say('20th December');
    await say('1');
    await say('500');
    await say('Nakuru');
    await say('skip');
    const confirm = await say('skip');
    expect(confirm).toMatch(/Name: Mike Otieno/);
    expect(confirm).toMatch(/Does that look right/i);
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
    await say('skip');
    await say('skip');
    await say('Mike');
    await say('1');
  }
});
