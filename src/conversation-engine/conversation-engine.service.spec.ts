import { Conversation } from '../conversation/conversation.entity';
import { DemoSimulationService } from '../demo-engine/demo-simulation.service';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { ConversationEngineService } from './conversation-engine.service';
import { TECHFIND_FALLBACK, TECHFIND_GREETING } from './techfind-copy';

describe('ConversationEngineService', () => {
  const stateMachine = {
    canTransition: jest.fn(),
    transition: jest.fn(),
  };
  const demos = {
    start: jest.fn(),
    handleInput: jest.fn(),
    findActive: jest.fn(),
    closeOpen: jest.fn(),
  };

  const engine = new ConversationEngineService(
    stateMachine as unknown as ConversationStateMachineService,
    demos as unknown as DemoSimulationService,
  );

  function convo(
    currentState: ConversationState,
    extras: Partial<Conversation> = {},
  ): Conversation {
    return {
      id: 'conv-1',
      tenantId: 'tenant-1',
      prospectPhone: '254711111111',
      currentState,
      demoMode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...extras,
    };
  }

  beforeEach(() => {
    stateMachine.transition.mockReset();
    demos.start.mockReset();
    demos.handleInput.mockReset();
    demos.findActive.mockReset();
    demos.closeOpen.mockReset();
    demos.closeOpen.mockResolvedValue(undefined);
    stateMachine.transition.mockImplementation(
      (
        _id: string,
        toState: ConversationState,
        context?: { demoMode?: string | null },
      ) =>
        Promise.resolve(
          convo(toState, { demoMode: context?.demoMode ?? null }),
        ),
    );
  });

  it('greets on NEW and moves to TECHFIND_GREETING', async () => {
    const result = await engine.handle(convo(ConversationState.NEW), 'hi');
    expect(stateMachine.transition).toHaveBeenCalledWith(
      'conv-1',
      ConversationState.TECHFIND_GREETING,
      undefined,
    );
    expect(result.replies).toEqual([TECHFIND_GREETING]);
  });

  it('starts the salon demo from TECHFIND_GREETING', async () => {
    demos.start.mockResolvedValue({
      result: { replyText: 'salon-start', isComplete: false },
    });

    const result = await engine.handle(
      convo(ConversationState.TECHFIND_GREETING),
      'salon',
    );

    expect(demos.start).toHaveBeenCalledWith('conv-1', 'salon');
    expect(result.replies).toEqual(['salon-start']);
    expect(stateMachine.transition).toHaveBeenCalledWith(
      'conv-1',
      ConversationState.DEMO_RUNNING,
      { demoMode: 'salon' },
    );
  });

  it('returns fallback when it cannot match a command', async () => {
    const result = await engine.handle(
      convo(ConversationState.TECHFIND_GREETING),
      'what do you cost?',
    );
    expect(result.replies).toEqual([TECHFIND_FALLBACK]);
    expect(demos.start).not.toHaveBeenCalled();
    expect(TECHFIND_GREETING.toLowerCase()).not.toContain('reply with:');
    expect(TECHFIND_GREETING).not.toMatch(/^• /m);
  });
});
