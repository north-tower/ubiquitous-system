import { Conversation } from '../conversation/conversation.entity';
import { ConversationState } from './conversation-state.enum';
import { ConversationStateMachineService } from './conversation-state-machine.service';
import {
  ConversationNotFoundError,
  InvalidStateTransitionError,
} from './invalid-state-transition.error';
import { TRANSITION_TABLE } from './transition-table';

describe('ConversationStateMachineService', () => {
  const conversations = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const service = new ConversationStateMachineService(conversations as never);

  function seed(partial: Partial<Conversation>): Conversation {
    return {
      id: 'conv-1',
      tenantId: 'tenant-1',
      prospectPhone: '254711111111',
      currentState: ConversationState.NEW,
      demoMode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
  }

  beforeEach(() => {
    conversations.findOne.mockReset();
    conversations.save.mockReset();
    conversations.save.mockImplementation((row: Conversation) =>
      Promise.resolve(row),
    );
  });

  describe('canTransition', () => {
    it('allows every edge in the transition table', () => {
      for (const [from, targets] of Object.entries(TRANSITION_TABLE)) {
        for (const to of targets) {
          expect(service.canTransition(from as ConversationState, to)).toBe(
            true,
          );
        }
      }
    });

    it('rejects representative invalid jumps', () => {
      expect(
        service.canTransition(
          ConversationState.NEW,
          ConversationState.MEETING_BOOKED,
        ),
      ).toBe(false);
      expect(
        service.canTransition(
          ConversationState.DEMO_RUNNING,
          ConversationState.LEAD_SCORED,
        ),
      ).toBe(false);
      expect(
        service.canTransition(
          ConversationState.MEETING_BOOKED,
          ConversationState.HUMAN_HANDOFF,
        ),
      ).toBe(false);
    });
  });

  describe('transition', () => {
    it('persists every valid table edge', async () => {
      for (const [from, targets] of Object.entries(TRANSITION_TABLE)) {
        for (const to of targets) {
          conversations.findOne.mockResolvedValueOnce(
            seed({ currentState: from as ConversationState }),
          );

          const updated = await service.transition('conv-1', to);

          expect(updated.currentState).toBe(to);
          expect(conversations.save).toHaveBeenCalled();
        }
      }
    });

    it('throws InvalidStateTransitionError for NEW -> MEETING_BOOKED', async () => {
      conversations.findOne.mockResolvedValue(
        seed({ currentState: ConversationState.NEW }),
      );

      await expect(
        service.transition('conv-1', ConversationState.MEETING_BOOKED),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);
      expect(conversations.save).not.toHaveBeenCalled();
    });

    it('throws InvalidStateTransitionError for DEMO_RUNNING -> LEAD_SCORED', async () => {
      conversations.findOne.mockResolvedValue(
        seed({ currentState: ConversationState.DEMO_RUNNING }),
      );

      await expect(
        service.transition('conv-1', ConversationState.LEAD_SCORED),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);
    });

    it('throws InvalidStateTransitionError for MEETING_BOOKED -> HUMAN_HANDOFF', async () => {
      conversations.findOne.mockResolvedValue(
        seed({ currentState: ConversationState.MEETING_BOOKED }),
      );

      await expect(
        service.transition('conv-1', ConversationState.HUMAN_HANDOFF),
      ).rejects.toBeInstanceOf(InvalidStateTransitionError);
    });

    it('clears demoMode when reset is triggered', async () => {
      conversations.findOne.mockResolvedValue(
        seed({
          currentState: ConversationState.DEMO_RUNNING,
          demoMode: 'salon',
        }),
      );

      const updated = await service.transition(
        'conv-1',
        ConversationState.TECHFIND_GREETING,
        { reset: true },
      );

      expect(updated.currentState).toBe(ConversationState.TECHFIND_GREETING);
      expect(updated.demoMode).toBeNull();
    });

    it('throws ConversationNotFoundError when the row is missing', async () => {
      conversations.findOne.mockResolvedValue(null);

      await expect(
        service.transition('missing', ConversationState.TECHFIND_GREETING),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
    });
  });
});
