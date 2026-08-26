import { Conversation } from '../conversation/conversation.entity';
import { ConversationService } from '../conversation/conversation.service';
import { TECHFIND_GREETING } from '../conversation-engine/techfind-copy';
import { DemoSimulationService } from '../demo-engine/demo-simulation.service';
import { ConversationSummaryService } from '../lead/conversation-summary.service';
import { LeadProfile } from '../lead/lead-profile.entity';
import { LeadProfileService } from '../lead/lead-profile.service';
import { LeadScoringService } from '../lead/lead-scoring.service';
import { QualificationFlowService } from '../lead/qualification-flow.service';
import { QUALIFICATION_QUESTIONS } from '../lead/qualification-questions';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { IndustryClassifierService } from './industry-classifier.service';
import { MEETING_OFFERED_COPY, RESET_NEXT_BUSINESS } from './orchestrator-copy';

function emptyProfile(): LeadProfile {
  return {
    id: 'lead-1',
    conversationId: 'conv-1',
    businessName: null,
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
  };
}

describe('AiOrchestratorService', () => {
  const conversations = {
    findById: jest.fn(),
  };
  const stateMachine = {
    transition: jest.fn(),
  };
  const demos = {
    start: jest.fn(),
    handleInput: jest.fn(),
    findActive: jest.fn(),
    closeOpen: jest.fn(),
  };
  const classifier = {
    classify: jest.fn(),
  };
  const leadProfiles = {
    findOrCreate: jest.fn(),
    save: jest.fn(),
    findByConversationId: jest.fn(),
  };
  const qualification = {
    nextUnansweredField: jest.fn(),
    nextQuestion: jest.fn(),
    recordAnswer: jest.fn(),
  };
  const scoring = {
    score: jest.fn(),
  };
  const summaries = {
    summarize: jest.fn(),
  };

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

  function createOrchestrator(
    qualificationOverride?: QualificationFlowService,
    scoringOverride?: LeadScoringService,
    leadOverride?: LeadProfileService,
  ): AiOrchestratorService {
    return new AiOrchestratorService(
      conversations as unknown as ConversationService,
      stateMachine as unknown as ConversationStateMachineService,
      demos as unknown as DemoSimulationService,
      classifier as unknown as IndustryClassifierService,
      (leadOverride ?? leadProfiles) as unknown as LeadProfileService,
      (qualificationOverride ??
        qualification) as unknown as QualificationFlowService,
      (scoringOverride ?? scoring) as unknown as LeadScoringService,
      summaries as unknown as ConversationSummaryService,
    );
  }

  const orchestrator = createOrchestrator();

  beforeEach(() => {
    conversations.findById.mockReset();
    stateMachine.transition.mockReset();
    demos.start.mockReset();
    demos.handleInput.mockReset();
    demos.findActive.mockReset();
    demos.closeOpen.mockReset();
    classifier.classify.mockReset();
    leadProfiles.findOrCreate.mockReset();
    leadProfiles.save.mockReset();
    qualification.nextUnansweredField.mockReset();
    qualification.nextQuestion.mockReset();
    qualification.recordAnswer.mockReset();
    scoring.score.mockReset();
    summaries.summarize.mockReset();
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

  it('greets on NEW and moves through TECHFIND_GREETING to INDUSTRY_DISCOVERY without AI', async () => {
    conversations.findById.mockResolvedValue(convo(ConversationState.NEW));

    const result = await orchestrator.handleInboundMessage('conv-1', 'hi');

    expect(classifier.classify).not.toHaveBeenCalled();
    expect(stateMachine.transition).toHaveBeenNthCalledWith(
      1,
      'conv-1',
      ConversationState.TECHFIND_GREETING,
    );
    expect(stateMachine.transition).toHaveBeenNthCalledWith(
      2,
      'conv-1',
      ConversationState.INDUSTRY_DISCOVERY,
    );
    expect(result.replyText).toBe(TECHFIND_GREETING);
    expect(result.conversation.currentState).toBe(
      ConversationState.INDUSTRY_DISCOVERY,
    );
  });

  it('classifies "I own a salon" into DEMO_RUNNING with demoMode salon', async () => {
    conversations.findById.mockResolvedValue(
      convo(ConversationState.INDUSTRY_DISCOVERY),
    );
    classifier.classify.mockResolvedValue({
      mode: 'salon',
      confidence: 0.91,
    });
    demos.start.mockResolvedValue({
      result: { replyText: 'salon-start', isComplete: false },
    });

    const result = await orchestrator.handleInboundMessage(
      'conv-1',
      'I own a salon',
    );

    expect(classifier.classify).toHaveBeenCalledWith('I own a salon', {
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
    });
    expect(stateMachine.transition).toHaveBeenCalledWith(
      'conv-1',
      ConversationState.DEMO_SELECTED,
      { demoMode: 'salon' },
    );
    expect(stateMachine.transition).toHaveBeenCalledWith(
      'conv-1',
      ConversationState.DEMO_RUNNING,
      { demoMode: 'salon' },
    );
    expect(demos.start).toHaveBeenCalledWith('conv-1', 'salon');
    expect(result.conversation.currentState).toBe(
      ConversationState.DEMO_RUNNING,
    );
    expect(result.conversation.demoMode).toBe('salon');
    expect(result.replyText).toBe('salon-start');
  });

  it('resets without calling OpenAI', async () => {
    conversations.findById.mockResolvedValue(
      convo(ConversationState.DEMO_RUNNING, { demoMode: 'salon' }),
    );

    const result = await orchestrator.handleInboundMessage('conv-1', 'reset');

    expect(classifier.classify).not.toHaveBeenCalled();
    expect(demos.closeOpen).toHaveBeenCalledWith('conv-1');
    expect(result.replyText).toBe(RESET_NEXT_BUSINESS);
    expect(result.conversation.currentState).toBe(
      ConversationState.INDUSTRY_DISCOVERY,
    );
  });

  it('walks VALUE_REVEAL → yes → six qualification answers → MEETING_OFFERED with a score', async () => {
    let stored = emptyProfile();
    const memoryProfiles = {
      findOrCreate: jest.fn(() => Promise.resolve(stored)),
      save: jest.fn((row: LeadProfile) => {
        stored = row;
        return Promise.resolve(row);
      }),
      findByConversationId: jest.fn(() => Promise.resolve(stored)),
    };
    const realQualification = new QualificationFlowService(
      memoryProfiles as unknown as LeadProfileService,
    );
    const realScoring = new LeadScoringService();
    summaries.summarize.mockResolvedValue(
      'Glow Salon tried the demo and has a night backlog.',
    );

    const live = createOrchestrator(
      realQualification,
      realScoring,
      memoryProfiles as unknown as LeadProfileService,
    );

    let current = convo(ConversationState.VALUE_REVEAL);
    conversations.findById.mockImplementation(() => Promise.resolve(current));
    stateMachine.transition.mockImplementation(
      (_id: string, toState: ConversationState) => {
        current = { ...current, currentState: toState };
        return Promise.resolve(current);
      },
    );

    const afterYes = await live.handleInboundMessage('conv-1', 'yes');
    expect(afterYes.conversation.currentState).toBe(
      ConversationState.BUSINESS_QUALIFICATION,
    );
    expect(afterYes.replyText).toContain(QUALIFICATION_QUESTIONS.businessName);

    const answers = [
      'Glow Salon',
      'about 50 a day',
      'They ask for prices and we reply one by one',
      '2',
      'none',
      'Messages pile up overnight',
    ];
    let last = afterYes;
    for (const answer of answers) {
      last = await live.handleInboundMessage('conv-1', answer);
    }

    expect(last.conversation.currentState).toBe(
      ConversationState.MEETING_OFFERED,
    );
    expect(last.replyText).toBe(MEETING_OFFERED_COPY);
    expect(stored.leadScore).toBe('HOT');
    expect(stored.conversationSummary).toBe(
      'Glow Salon tried the demo and has a night backlog.',
    );
    expect(summaries.summarize).toHaveBeenCalledWith('conv-1');
  });
});
