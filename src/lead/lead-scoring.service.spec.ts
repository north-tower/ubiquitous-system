import { LeadProfile } from './lead-profile.entity';
import { LeadScoringService } from './lead-scoring.service';
import {
  HOT_MIN_DAILY_ENQUIRIES,
  NEXT_ACTION_BY_SCORE,
  WARM_MIN_DAILY_ENQUIRIES,
} from './scoring-thresholds';

function profile(overrides: Partial<LeadProfile>): LeadProfile {
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
    ...overrides,
  };
}

describe('LeadScoringService', () => {
  const service = new LeadScoringService();

  it('scores HOT at the enquiry threshold with a pain point and no system', () => {
    const result = service.score(
      profile({
        businessName: 'Glow Salon',
        dailyEnquiryVolume: HOT_MIN_DAILY_ENQUIRIES,
        staffCount: 0,
        existingSystem: 'none',
        painPoint: 'Messages pile up overnight',
      }),
    );
    expect(result).toEqual({
      leadScore: 'HOT',
      nextAction: NEXT_ACTION_BY_SCORE.HOT,
    });
  });

  it('scores WARM when volume meets the warm floor but not HOT', () => {
    const result = service.score(
      profile({
        businessName: 'Glow Salon',
        dailyEnquiryVolume: WARM_MIN_DAILY_ENQUIRIES,
        staffCount: 0,
        existingSystem: 'HubSpot',
        painPoint: 'A bit slow to reply',
      }),
    );
    expect(result).toEqual({
      leadScore: 'WARM',
      nextAction: NEXT_ACTION_BY_SCORE.WARM,
    });
  });

  it('scores COLD when volume is below the warm floor', () => {
    const result = service.score(
      profile({
        businessName: 'Tiny stall',
        dailyEnquiryVolume: WARM_MIN_DAILY_ENQUIRIES - 1,
        staffCount: 1,
        existingSystem: 'none',
        painPoint: 'Not sure',
      }),
    );
    expect(result).toEqual({
      leadScore: 'COLD',
      nextAction: NEXT_ACTION_BY_SCORE.COLD,
    });
  });
});
