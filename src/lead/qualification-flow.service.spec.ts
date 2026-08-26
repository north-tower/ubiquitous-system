import { LeadProfile } from './lead-profile.entity';
import { LeadProfileService } from './lead-profile.service';
import { QualificationFlowService } from './qualification-flow.service';
import {
  QUALIFICATION_FIELDS,
  QUALIFICATION_QUESTIONS,
} from './qualification-questions';

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

describe('QualificationFlowService', () => {
  const profiles = {
    save: jest.fn((profile: LeadProfile) => Promise.resolve(profile)),
  };
  const service = new QualificationFlowService(
    profiles as unknown as LeadProfileService,
  );

  beforeEach(() => {
    profiles.save.mockClear();
  });

  it('asks required fields in fixed order and returns null when filled', () => {
    const profile = emptyProfile();
    expect(service.nextQuestion(profile)).toBe(
      QUALIFICATION_QUESTIONS.businessName,
    );

    profile.businessName = 'Glow Salon';
    expect(service.nextQuestion(profile)).toBe(
      QUALIFICATION_QUESTIONS.dailyEnquiryVolume,
    );

    profile.dailyEnquiryVolume = 50;
    expect(service.nextQuestion(profile)).toBe(
      QUALIFICATION_QUESTIONS.currentProcess,
    );

    profile.currentProcess = 'We reply one by one';
    expect(service.nextQuestion(profile)).toBe(
      QUALIFICATION_QUESTIONS.staffCount,
    );

    profile.staffCount = 2;
    expect(service.nextQuestion(profile)).toBe(
      QUALIFICATION_QUESTIONS.existingSystem,
    );

    profile.existingSystem = 'none';
    expect(service.nextQuestion(profile)).toBe(
      QUALIFICATION_QUESTIONS.painPoint,
    );

    profile.painPoint = 'Messages pile up overnight';
    expect(service.nextQuestion(profile)).toBeNull();
    expect(service.nextUnansweredField(profile)).toBeNull();
    expect(QUALIFICATION_FIELDS).toHaveLength(6);
  });

  it('records dailyEnquiryVolume from "about 50 a day" without AI', async () => {
    const profile = emptyProfile();
    const result = await service.recordAnswer(
      profile,
      'dailyEnquiryVolume',
      'about 50 a day',
      { tenantId: 'tenant-1' },
    );
    expect(result.recorded).toBe(true);
    expect(result.parsePath).toBe('deterministic');
    expect(result.profile.dailyEnquiryVolume).toBe(50);
  });
});
