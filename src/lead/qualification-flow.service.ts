import { Injectable, Logger, Optional } from '@nestjs/common';
import { EntityExtractionService } from '../ai-orchestrator/entity-extraction.service';
import { LeadProfile } from './lead-profile.entity';
import { LeadProfileService } from './lead-profile.service';
import { parseCount } from './parse-count';
import {
  QUALIFICATION_FIELDS,
  QUALIFICATION_QUESTIONS,
  type QualificationField,
} from './qualification-questions';

export type QualificationParsePath =
  'deterministic' | 'ai-fallback' | 'raw' | 'unparsed';

export type RecordAnswerResult = {
  profile: LeadProfile;
  recorded: boolean;
  parsePath: QualificationParsePath;
};

const COUNT_FIELDS = new Set<QualificationField>([
  'dailyEnquiryVolume',
  'staffCount',
]);

@Injectable()
export class QualificationFlowService {
  private readonly logger = new Logger(QualificationFlowService.name);

  constructor(
    private readonly profiles: LeadProfileService,
    @Optional() private readonly extractor?: EntityExtractionService,
  ) {}

  nextUnansweredField(profile: LeadProfile): QualificationField | null {
    for (const field of QUALIFICATION_FIELDS) {
      if (!isFilled(profile, field)) {
        return field;
      }
    }
    return null;
  }

  nextQuestion(leadProfile: LeadProfile): string | null {
    const field = this.nextUnansweredField(leadProfile);
    return field ? QUALIFICATION_QUESTIONS[field] : null;
  }

  async recordAnswer(
    leadProfile: LeadProfile,
    fieldBeingAsked: QualificationField,
    freeText: string,
    context: { tenantId: string },
  ): Promise<RecordAnswerResult> {
    const trimmed = freeText.trim();
    if (!trimmed) {
      return { profile: leadProfile, recorded: false, parsePath: 'unparsed' };
    }

    if (COUNT_FIELDS.has(fieldBeingAsked)) {
      return this.recordCount(leadProfile, fieldBeingAsked, trimmed, context);
    }

    applyStringField(leadProfile, fieldBeingAsked, trimmed);
    const saved = await this.profiles.save(leadProfile);
    this.logger.log(
      `qualification parse path=raw field=${fieldBeingAsked} conversation=${leadProfile.conversationId}`,
    );
    return { profile: saved, recorded: true, parsePath: 'raw' };
  }

  private async recordCount(
    leadProfile: LeadProfile,
    field: QualificationField,
    freeText: string,
    context: { tenantId: string },
  ): Promise<RecordAnswerResult> {
    let value = parseCount(freeText);
    let parsePath: QualificationParsePath = 'deterministic';

    if (value === null) {
      value = await this.extractCount(leadProfile, field, freeText, context);
      parsePath = value === null ? 'unparsed' : 'ai-fallback';
    }

    this.logger.log(
      `qualification parse path=${parsePath} field=${field} conversation=${leadProfile.conversationId}`,
    );

    if (value === null) {
      return { profile: leadProfile, recorded: false, parsePath: 'unparsed' };
    }

    if (field === 'dailyEnquiryVolume') {
      leadProfile.dailyEnquiryVolume = value;
    } else {
      leadProfile.staffCount = value;
    }
    const saved = await this.profiles.save(leadProfile);
    return { profile: saved, recorded: true, parsePath };
  }

  private async extractCount(
    leadProfile: LeadProfile,
    field: QualificationField,
    freeText: string,
    context: { tenantId: string },
  ): Promise<number | null> {
    if (!this.extractor) {
      return null;
    }
    try {
      const extracted = await this.extractor.extract(
        'qualification',
        field,
        freeText,
        {
          conversationId: leadProfile.conversationId,
          tenantId: context.tenantId,
        },
      );
      if (extracted.matched !== true) {
        return null;
      }
      const raw: unknown =
        field === 'dailyEnquiryVolume'
          ? extracted.dailyEnquiryVolume
          : extracted.staffCount;
      return typeof raw === 'number' && Number.isFinite(raw)
        ? Math.round(raw)
        : null;
    } catch (error) {
      this.logger.error(
        `qualification AI extract failed field=${field} conversation=${leadProfile.conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}

function isFilled(profile: LeadProfile, field: QualificationField): boolean {
  if (field === 'dailyEnquiryVolume') {
    return profile.dailyEnquiryVolume !== null;
  }
  if (field === 'staffCount') {
    return profile.staffCount !== null;
  }
  const value = profile[field];
  return typeof value === 'string' && value.trim().length > 0;
}

function applyStringField(
  profile: LeadProfile,
  field: QualificationField,
  value: string,
): void {
  if (field === 'businessName') {
    profile.businessName = value;
    return;
  }
  if (field === 'currentProcess') {
    profile.currentProcess = value;
    return;
  }
  if (field === 'existingSystem') {
    profile.existingSystem = value;
    return;
  }
  if (field === 'painPoint') {
    profile.painPoint = value;
  }
}
