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

  it('completes tax path when KRA status is chosen', async () => {
    sessions.findActive.mockResolvedValue({
      id: 'sess-1',
      conversationId: 'conv-1',
      currentStep: HMG_STEPS.AWAITING_KRA_STATUS,
      payload: {
        serviceId: 'tax_kra',
        entityId: 'ngo_sacco_trust',
        businessName: 'ACME',
      },
    } as never);
    sessions.save.mockImplementation(async (session, next) => ({
      ...session,
      currentStep: next.step,
      payload: next.payload,
    }));

    const reply = await service.handleInbound(conversation, 'kra_notice');
    expect(reply.replyText).toContain('HMG-');
    expect(reply.replyText).toContain('KRA notice');
    expect(reply.replyText).toContain('ACME');
    expect(sessions.markSubmitted).toHaveBeenCalled();
  });
});
