import { Conversation } from '../conversation/conversation.entity';
import { InsightfulPosClient } from '../insightful-pos/insightful-pos.client';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { PosOpsFlowService } from './pos-ops-flow.service';
import { PosOpsSession } from './pos-ops-session.entity';
import { PosOpsSessionService } from './pos-ops-session.service';
import { POS_OPS_STEPS } from './pos-ops-steps';

describe('PosOpsFlowService', () => {
  const sessions = {
    closeOpen: jest.fn(),
    start: jest.fn(),
    findActive: jest.fn(),
    save: jest.fn(),
    close: jest.fn(),
  };
  const pos = {
    isConfigured: jest.fn(() => true),
    identify: jest.fn(),
    searchProducts: jest.fn(),
    searchCustomers: jest.fn(),
    createSale: jest.fn(),
    payAccount: jest.fn(),
  };
  const stateMachine = {
    enterHumanHandoff: jest.fn(),
  };

  const service = new PosOpsFlowService(
    sessions as unknown as PosOpsSessionService,
    pos as unknown as InsightfulPosClient,
    stateMachine as unknown as ConversationStateMachineService,
  );

  const conversation = {
    id: 'conv-1',
    prospectPhone: '254798229340',
  } as Conversation;

  beforeEach(() => {
    jest.resetAllMocks();
    pos.isConfigured.mockReturnValue(true);
    sessions.closeOpen.mockResolvedValue(undefined);
    sessions.findActive.mockResolvedValue(null);
    sessions.start.mockImplementation(
      (_cid, step, payload) =>
        Promise.resolve({
          id: 'sess-1',
          conversationId: 'conv-1',
          currentStep: step,
          payload,
          closedAt: null,
          reference: null,
        } as PosOpsSession),
    );
  });

  it('refuses unknown staff phones', async () => {
    pos.identify.mockResolvedValue(null);

    const reply = await service.handleInbound(conversation, 'hello');

    expect(reply.replyText).toContain('not authorised');
    expect(sessions.start).not.toHaveBeenCalled();
  });

  it('opens the main menu for linked staff', async () => {
    pos.identify.mockResolvedValue({
      authorised: true,
      profileId: 'p1',
      storeId: 's1',
      staffName: 'Jane',
      staffRole: 'manager',
      businessMode: 'retail',
      storeName: 'Main',
    });

    const reply = await service.handleInbound(conversation, 'hello');

    expect(sessions.start).toHaveBeenCalledWith(
      'conv-1',
      POS_OPS_STEPS.MENU,
      expect.objectContaining({ staffName: 'Jane', storeName: 'Main' }),
    );
    expect(reply.replyText).toContain('Record a sale');
  });
});
