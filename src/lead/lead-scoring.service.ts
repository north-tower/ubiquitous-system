import { Injectable } from '@nestjs/common';
import { LeadProfile, type LeadScore } from './lead-profile.entity';
import {
  HOT_MIN_DAILY_ENQUIRIES,
  HOT_MIN_STAFF_HANDLING_MANUALLY,
  isNoneOrManualSystem,
  NEXT_ACTION_BY_SCORE,
  WARM_MIN_DAILY_ENQUIRIES,
} from './scoring-thresholds';

export type LeadScoreResult = {
  leadScore: LeadScore;
  nextAction: string;
};

@Injectable()
export class LeadScoringService {
  score(leadProfile: LeadProfile): LeadScoreResult {
    const leadScore = this.tier(leadProfile);
    return {
      leadScore,
      nextAction: NEXT_ACTION_BY_SCORE[leadScore],
    };
  }

  private tier(profile: LeadProfile): LeadScore {
    const volume = profile.dailyEnquiryVolume;
    const hasPain = Boolean(profile.painPoint?.trim());
    const operationalProblem =
      isNoneOrManualSystem(profile.existingSystem) ||
      (profile.staffCount !== null &&
        profile.staffCount >= HOT_MIN_STAFF_HANDLING_MANUALLY);

    if (
      volume !== null &&
      volume >= HOT_MIN_DAILY_ENQUIRIES &&
      hasPain &&
      operationalProblem
    ) {
      return 'HOT';
    }

    if (
      volume !== null &&
      volume >= WARM_MIN_DAILY_ENQUIRIES &&
      Boolean(profile.businessName?.trim())
    ) {
      return 'WARM';
    }

    return 'COLD';
  }
}
