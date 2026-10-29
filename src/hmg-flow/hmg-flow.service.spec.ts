import { HmgFlowService } from './hmg-flow.service';
import { HmgSessionService } from './hmg-session.service';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import type { Conversation } from '../conversation/conversation.entity';
import { HMG_STEPS } from './hmg-steps';

describe('HmgFlowService', () => {
  const sessions = {
    closeOpen: jest.fn(),
    start: jest.fn(),
    findActive: jest.fn(),
    findLatest: jest.fn(),
    save: jest.fn(),
    markSubmitted: jest.fn(),
  } as unknown as jest.Mocked<HmgSessionService>;

  const stateMachine = {
    resumeAutomation: jest.fn(),
    enterHumanHandoff: jest.fn(),
  } as unknown as jest.Mocked<ConversationStateMachineService>;

  const conversation = { id: 'conv-1', currentState: 'NEW' } as Conversation;

  const service = new HmgFlowService(sessions, stateMachine);

  beforeEach(() => {
    jest.resetAllMocks();
    sessions.closeOpen.mockResolvedValue(undefined);
    sessions.start.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_TOPIC,
      payload: {},
    } as never);
    sessions.findActive.mockResolvedValue(null);
    sessions.findLatest.mockResolvedValue(null);
  });

  it('opens with greeting list on first message', async () => {
    const reply = await service.handleInbound(conversation, 'Hello, book consultation');
    expect(reply.baileysList?.sections[0].rows).toHaveLength(6);
    expect(reply.replyText).toContain('HMG Group Africa');
    expect(sessions.start).toHaveBeenCalledWith(
      'conv-1',
      HMG_STEPS.AWAITING_TOPIC,
      {},
    );
  });

  it('accepts list row id tax_kra and asks entity type', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_TOPIC,
      payload: {},
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const reply = await service.handleInbound(conversation, 'tax_kra');
    expect(reply.replyText).toContain('business or for you personally');
    expect(reply.baileysList?.sections[0].rows).toHaveLength(4);
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ step: HMG_STEPS.AWAITING_ENTITY }),
    );
  });

  it('accepts tax health check and follows the same entity path as tax & KRA', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_TOPIC,
      payload: {},
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const reply = await service.handleInbound(conversation, 'tax health');
    expect(reply.replyText).toContain('business or for you personally');
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_ENTITY,
        payload: expect.objectContaining({ serviceId: 'tax_health' }),
      }),
    );
  });

  it('after entity type, asks for business name', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_ENTITY,
      payload: { serviceId: 'tax_kra' },
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const reply = await service.handleInbound(conversation, 'ngo_sacco_trust');
    expect(reply.replyText).toContain('name of the business');
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_BUSINESS_NAME,
        payload: expect.objectContaining({ entityId: 'ngo_sacco_trust' }),
      }),
    );
  });

  it('after business name, shows KRA status list', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BUSINESS_NAME,
      payload: { serviceId: 'tax_kra', entityId: 'ngo_sacco_trust' },
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const reply = await service.handleInbound(conversation, 'ACME');
    expect(reply.replyText).toContain('Where do things stand with KRA');
    expect(reply.baileysList?.sections[0].rows).toHaveLength(4);
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_KRA_STATUS,
        payload: expect.objectContaining({ businessName: 'ACME' }),
      }),
    );
  });

  it('after KRA status, asks how soon to speak with an advisor', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_KRA_STATUS,
      payload: {
        serviceId: 'tax_kra',
        entityId: 'sole_proprietor',
        businessName: 'ACME',
      },
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const reply = await service.handleInbound(conversation, 'filings_up_to_date');
    expect(reply.replyText).toContain('speak with an advisor');
    expect(reply.baileysList?.sections[0].rows).toHaveLength(4);
    expect(sessions.markSubmitted).not.toHaveBeenCalled();
  });

  it('completes tax path through booking details', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BOOKING_PHONE,
      payload: {
        serviceId: 'tax_kra',
        entityId: 'sole_proprietor',
        businessName: 'ACME',
        kraStatusId: 'filings_up_to_date',
        timingId: 'urgent_deadline',
        meetingId: 'office_akai_plaza',
        requestId: 'book_consultation',
        contactName: 'miki',
      },
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const reply = await service.handleInbound(conversation, '0799229340');
    expect(reply.replyText).toContain('Thank you, miki');
    expect(reply.replyText).toContain('Consultation Requested');
    expect(reply.replyText).toContain('Akai Plaza');
    expect(reply.replyText).toContain('0799229340');
    expect(sessions.markSubmitted).toHaveBeenCalled();
  });

  it('accepts payroll and follows entity, business name, and headcount path', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_TOPIC,
      payload: {},
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const topicReply = await service.handleInbound(conversation, 'payroll');
    expect(topicReply.replyText).toContain('business or for you personally');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_ENTITY,
        payload: expect.objectContaining({ serviceId: 'payroll' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_ENTITY,
      payload: { serviceId: 'payroll' },
    } as never);

    const entityReply = await service.handleInbound(
      conversation,
      'limited_company',
    );
    expect(entityReply.replyText).toContain('name of the business');

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BUSINESS_NAME,
      payload: { serviceId: 'payroll', entityId: 'limited_company' },
    } as never);

    const nameReply = await service.handleInbound(conversation, 'ACME');
    expect(nameReply.replyText).toContain('How many people are on the payroll');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_PAYROLL_SIZE,
        payload: expect.objectContaining({ businessName: 'ACME' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_PAYROLL_SIZE,
      payload: {
        serviceId: 'payroll',
        entityId: 'limited_company',
        businessName: 'ACME',
      },
    } as never);

    const sizeReply = await service.handleInbound(conversation, 'size_6_20');
    expect(sizeReply.replyText).toContain('speak with an advisor');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_TIMING,
        payload: expect.objectContaining({ payrollSizeId: 'size_6_20' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BOOKING_PHONE,
      payload: {
        serviceId: 'payroll',
        entityId: 'limited_company',
        businessName: 'ACME',
        payrollSizeId: 'size_6_20',
        timingId: 'urgent_deadline',
        meetingId: 'office_akai_plaza',
        requestId: 'book_consultation',
        contactName: 'MIKI',
      },
    } as never);

    const doneReply = await service.handleInbound(conversation, '0799229340');
    expect(doneReply.replyText).toContain('Thank you, MIKI');
    expect(doneReply.replyText).toContain('Payroll');
    expect(doneReply.replyText).toContain('6–20');
    expect(sessions.markSubmitted).toHaveBeenCalled();
  });

  it('accepts accounting and follows books handling path', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_TOPIC,
      payload: {},
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const topicReply = await service.handleInbound(conversation, 'accounting');
    expect(topicReply.replyText).toContain('business or for you personally');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_ENTITY,
        payload: expect.objectContaining({ serviceId: 'accounting' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BUSINESS_NAME,
      payload: {
        serviceId: 'accounting',
        entityId: 'limited_company',
      },
    } as never);

    const nameReply = await service.handleInbound(conversation, 'acme');
    expect(nameReply.replyText).toContain('How are the books handled');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_BOOKS_HANDLING,
        payload: expect.objectContaining({ businessName: 'acme' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BOOKING_PHONE,
      payload: {
        serviceId: 'accounting',
        entityId: 'limited_company',
        businessName: 'acme',
        booksHandlingId: 'in_house_accountant',
        timingId: 'urgent_deadline',
        meetingId: 'office_akai_plaza',
        requestId: 'book_consultation',
        contactName: 'miki',
      },
    } as never);

    const doneReply = await service.handleInbound(conversation, '0799229340');
    expect(doneReply.replyText).toContain('Thank you, miki');
    expect(doneReply.replyText).toContain('Accounting & bookkeeping');
    expect(doneReply.replyText).toContain('In-house accountant');
    expect(sessions.markSubmitted).toHaveBeenCalled();
  });

  it('accepts audit and follows entity, business name, and audit purpose path', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_TOPIC,
      payload: {},
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const topicReply = await service.handleInbound(conversation, 'audit');
    expect(topicReply.replyText).toContain('business or for you personally');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_ENTITY,
        payload: expect.objectContaining({ serviceId: 'audit' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_ENTITY,
      payload: { serviceId: 'audit' },
    } as never);

    const entityReply = await service.handleInbound(
      conversation,
      'sole_proprietor',
    );
    expect(entityReply.replyText).toContain('name of the business');

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BUSINESS_NAME,
      payload: { serviceId: 'audit', entityId: 'sole_proprietor' },
    } as never);

    const nameReply = await service.handleInbound(conversation, 'ACME');
    expect(nameReply.replyText).toContain('What is the audit for?');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_AUDIT_PURPOSE,
        payload: expect.objectContaining({ businessName: 'ACME' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_AUDIT_PURPOSE,
      payload: {
        serviceId: 'audit',
        entityId: 'sole_proprietor',
        businessName: 'ACME',
      },
    } as never);

    const purposeReply = await service.handleInbound(
      conversation,
      'statutory_audit',
    );
    expect(purposeReply.replyText).toContain('speak with an advisor');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_TIMING,
        payload: expect.objectContaining({ auditPurposeId: 'statutory_audit' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BOOKING_PHONE,
      payload: {
        serviceId: 'audit',
        entityId: 'sole_proprietor',
        businessName: 'ACME',
        auditPurposeId: 'statutory_audit',
        timingId: 'urgent_deadline',
        meetingId: 'office_akai_plaza',
        requestId: 'book_consultation',
        contactName: 'MIKI',
      },
    } as never);

    const doneReply = await service.handleInbound(conversation, '0799229340');
    expect(doneReply.replyText).toContain('Thank you, MIKI');
    expect(doneReply.replyText).toContain('Audit & assurance');
    expect(doneReply.replyText).toContain('Statutory audit');
    expect(sessions.markSubmitted).toHaveBeenCalled();
  });

  it('accepts something else through entity, brief, and full consultation path', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_TOPIC,
      payload: {},
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const topicReply = await service.handleInbound(conversation, 'something_else');
    expect(topicReply.replyText).toContain('business or for you personally');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_ENTITY,
        payload: expect.objectContaining({ serviceId: 'something_else' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_ENTITY,
      payload: { serviceId: 'something_else' },
    } as never);

    const entityReply = await service.handleInbound(
      conversation,
      'sole_proprietor',
    );
    expect(entityReply.replyText).toContain('name of the business');

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BUSINESS_NAME,
      payload: { serviceId: 'something_else', entityId: 'sole_proprietor' },
    } as never);

    const nameReply = await service.handleInbound(conversation, 'acme');
    expect(nameReply.replyText).toContain('what would you like to go through');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_BRIEF,
        payload: expect.objectContaining({ businessName: 'acme' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BRIEF,
      payload: {
        serviceId: 'something_else',
        entityId: 'sole_proprietor',
        businessName: 'acme',
      },
    } as never);

    const briefReply = await service.handleInbound(conversation, 'kkl');
    expect(briefReply.replyText).toContain('speak with an advisor');
    expect(sessions.save).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        step: HMG_STEPS.AWAITING_TIMING,
        payload: expect.objectContaining({ brief: 'kkl' }),
      }),
    );

    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_BOOKING_PHONE,
      payload: {
        serviceId: 'something_else',
        entityId: 'sole_proprietor',
        businessName: 'acme',
        brief: 'kkl',
        timingId: 'urgent_deadline',
        meetingId: 'office_akai_plaza',
        requestId: 'book_consultation',
        contactName: 'miki',
      },
    } as never);

    const doneReply = await service.handleInbound(conversation, '0799229340');
    expect(doneReply.replyText).toContain('Thank you, miki');
    expect(doneReply.replyText).toContain('Something else');
    expect(doneReply.replyText).toContain('kkl');
    expect(sessions.markSubmitted).toHaveBeenCalled();
  });

  it('completes tax path when advisor call is chosen', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_PUT_THROUGH,
      payload: {
        serviceId: 'tax_kra',
        entityId: 'sole_proprietor',
        businessName: 'ACME',
        kraStatusId: 'filings_up_to_date',
        timingId: 'this_week',
        meetingId: 'phone_call',
      },
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const reply = await service.handleInbound(conversation, 'advisor_call_me');
    expect(reply.replyText).toContain('HMG-');
    expect(reply.replyText).toContain('Advisor call');
    expect(sessions.markSubmitted).toHaveBeenCalled();
  });
});
