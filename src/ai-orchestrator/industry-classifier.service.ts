import { Injectable } from '@nestjs/common';
import { OpenAiClientService } from './openai-client.service';
import { AI_PURPOSE } from './openai.constants';
import {
  INDUSTRY_MODES,
  isIndustryMode,
  type IndustryMode,
} from './industry-modes';

export type IndustryClassification = {
  mode: IndustryMode;
  confidence: number;
};

export type ClassifierContext = {
  conversationId: string;
  tenantId: string;
};

const INDUSTRY_CLASSIFICATION_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  additionalProperties: false,
  properties: {
    mode: { type: 'string', enum: [...INDUSTRY_MODES] },
    confidence: { type: 'number' },
  },
  required: ['mode', 'confidence'],
};

@Injectable()
export class IndustryClassifierService {
  constructor(private readonly openai: OpenAiClientService) {}

  async classify(
    freeText: string,
    context: ClassifierContext,
  ): Promise<IndustryClassification> {
    const { data } = await this.openai.completeJson<{
      mode: string;
      confidence: number;
    }>({
      purpose: AI_PURPOSE.INDUSTRY_CLASSIFICATION,
      conversationId: context.conversationId,
      tenantId: context.tenantId,
      schemaName: 'industry_classification',
      schema: INDUSTRY_CLASSIFICATION_SCHEMA,
      systemPrompt: [
        "You classify a prospect's business for a WhatsApp demo.",
        'Return one of the allowed mode strings only.',
        'If no listed industry engine would fit (for example a hardware store), return generic.',
        'Never invent a mode that is not in the enum.',
      ].join(' '),
      userPrompt: freeText,
    });

    const mode = isIndustryMode(data.mode) ? data.mode : 'generic';
    const confidence = clampConfidence(data.confidence);
    return { mode, confidence };
  }
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
