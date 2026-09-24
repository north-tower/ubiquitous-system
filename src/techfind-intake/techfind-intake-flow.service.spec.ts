import { ConfigService } from '@nestjs/config';
import { Conversation } from '../conversation/conversation.entity';
import { LeadProfileService } from '../lead/lead-profile.service';
import { LeadScoringService } from '../lead/lead-scoring.service';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { TECHFIND_INTAKE_STEPS } from './techfind-intake-steps';
import { TechfindIntakeFlowService } from './techfind-intake-flow.service';
import { TechfindIntakeSession } from './techfind-intake-session.entity';
import { TechfindIntakeSessionService } from './techfind-intake-session.service';

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    tenantId: 'tenant-1',
    prospectPhone: '+254700000000',
    currentState: ConversationState.NEW,
    demoMode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function session(overrides: Partial<TechfindIntakeSession> = {}): TechfindIntakeSession {
  return {
    id: 'sess-1',
    conversationId: 'conv-1',
    currentStep: TECHFIND_INTAKE_STEPS.AWAITING_MENU,
    payload: {},
    createdAt: new Date(),
    completedAt: null,
    ...overrides,
  };
}

describe('TechfindIntakeFlowService', () => {
  const sessions = {
    start: jest.fn(),
    save: jest.fn(),
    markComplete: jest.fn(),
    findActive: jest.fn(),
    findLatest: jest.fn(),
    closeOpen: jest.fn(),
  };
  const stateMachine = {
    transition: jest.fn(),
    enterHumanHandoff: jest.fn(),
    resumeAutomation: jest.fn(),
  };
  const leadProfiles = {
    findOrCreate: jest.fn(),
    save: jest.fn(),
  };
  const scoring = new LeadScoringService();
  const config = {
    get: jest.fn(),
  };

  function createService(): TechfindIntakeFlowService {
    return new TechfindIntakeFlowService(
      sessions as unknown as TechfindIntakeSessionService,
      stateMachine as unknown as ConversationStateMachineService,
      leadProfiles as unknown as LeadProfileService,
      scoring,
      config as unknown as ConfigService,
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();
    sessions.start.mockImplementation(async (_id, step, payload) =>
      session({ currentStep: step, payload }),
    );
    sessions.save.mockImplementation(async (s, next) =>
      session({ ...s, currentStep: next.step, payload: next.payload }),
    );
    sessions.markComplete.mockImplementation(async (s) =>
      session({ ...s, completedAt: new Date() }),
    );
    sessions.findActive.mockResolvedValue(null);
    sessions.findLatest.mockResolvedValue(null);
    stateMachine.transition.mockImplementation(async (id, toState) =>
      conversation({ id, currentState: toState }),
    );
    leadProfiles.findOrCreate.mockResolvedValue({
      id: 'lead-1',
      conversationId: 'conv-1',
      contactName: null,
      businessName: null,
      serviceRequired: null,
      dailyEnquiryVolume: null,
      currentProcess: null,
      staffCount: null,
      existingSystem: null,
      painPoint: null,
      requestedFeatures: [],
      conversationSummary: null,
      leadScore: null,
      nextAction: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    leadProfiles.save.mockImplementation(async (p) => p);
    config.get.mockReturnValue(undefined);
  });

  it('opens with the Techfind service menu', async () => {
    const reply = await createService().handleInbound(conversation(), 'hi');
    expect(sessions.start).toHaveBeenCalledWith(
      'conv-1',
      TECHFIND_INTAKE_STEPS.AWAITING_MENU,
      {},
    );
    expect(reply.replyText).toMatch(/Website/);
    expect(reply.replyText).toMatch(/Explore PLAAGG/);
  });

  it('sends the website URL after intake for option 1', async () => {
    sessions.findActive
      .mockResolvedValueOnce(
        session({
          currentStep: TECHFIND_INTAKE_STEPS.AWAITING_QUALIFICATION,
          payload: {
            serviceId: 'website',
            contactName: 'Jane',
            businessName: 'Acme Ltd',
          },
        }),
      )
      .mockResolvedValue(null);

    const reply = await createService().handleInbound(
      conversation({ currentState: ConversationState.TECHFIND_GREETING }),
      'A brochure site for our logistics brand',
    );

    expect(leadProfiles.save).toHaveBeenCalled();
    expect(sessions.markComplete).toHaveBeenCalled();
    expect(reply.replyText).toMatch(/techfindconsulting\.africa/);
  });

  it('enters human handoff when the customer picks speak to the team', async () => {
    sessions.findActive.mockResolvedValue(
      session({
        currentStep: TECHFIND_INTAKE_STEPS.AWAITING_QUALIFICATION,
        payload: {
          serviceId: 'speak_to_team',
          contactName: 'Jane',
          businessName: 'Acme Ltd',
        },
      }),
    );

    await createService().handleInbound(
      conversation({ currentState: ConversationState.TECHFIND_GREETING }),
      'Need pricing for WhatsApp bots',
    );

    expect(stateMachine.enterHumanHandoff).toHaveBeenCalledWith('conv-1');
  });
});
