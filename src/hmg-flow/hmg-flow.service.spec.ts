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
    expect(reply.telnyxButtons?.buttons).toHaveLength(3);
    expect(reply.replyText).toContain('HMG Group Africa');
    expect(sessions.start).toHaveBeenCalledWith(
      'conv-1',
      HMG_STEPS.AWAITING_TOPIC,
      {},
    );
  });

  it('accepts list row id tax_kra', async () => {
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
    expect(reply.replyText).toContain('Tax & KRA');
    expect(reply.baileysList).toBeUndefined();
    expect(sessions.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ step: HMG_STEPS.AWAITING_BRIEF }),
    );
  });
});
