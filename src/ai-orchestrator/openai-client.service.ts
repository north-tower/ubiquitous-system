import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { OpenAI } from 'openai';
import { Repository } from 'typeorm';
import { AIUsageEvent } from './ai-usage-event.entity';
import {
  DEFAULT_OPENAI_MODEL,
  OPENAI_SDK,
  supportsJsonSchema,
} from './openai.constants';
import { estimateCostUsd } from './openai-token-rates';

export type OpenAiJsonRequest = {
  purpose: string;
  conversationId: string;
  tenantId: string;
  schemaName: string;
  schema: { [key: string]: unknown };
  systemPrompt: string;
  userPrompt: string;
};

export type OpenAiUsageMeta = {
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export type OpenAiJsonResult<T> = {
  data: T;
  usage: OpenAiUsageMeta;
};

@Injectable()
export class OpenAiClientService {
  private readonly logger = new Logger(OpenAiClientService.name);

  constructor(
    @Inject(OPENAI_SDK) private readonly openai: OpenAI,
    private readonly config: ConfigService,
    @InjectRepository(AIUsageEvent)
    private readonly usageEvents: Repository<AIUsageEvent>,
  ) {}

  async completeJson<T>(
    request: OpenAiJsonRequest,
  ): Promise<OpenAiJsonResult<T>> {
    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || DEFAULT_OPENAI_MODEL;
    const useJsonSchema = supportsJsonSchema(model);
    const systemPrompt = useJsonSchema
      ? request.systemPrompt
      : [
          request.systemPrompt,
          'Respond with a JSON object only (no markdown) matching this schema:',
          JSON.stringify(request.schema),
        ].join('\n');

    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      response_format: useJsonSchema
        ? {
            type: 'json_schema',
            json_schema: {
              name: request.schemaName,
              strict: true,
              schema: request.schema,
            },
          }
        : { type: 'json_object' },
    });

    const usedModel = completion.model || model;
    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;
    const usage: OpenAiUsageMeta = {
      inputTokens,
      outputTokens,
      model: usedModel,
    };

    await this.recordUsage(request, usage);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error(
        `OpenAI returned empty content purpose=${request.purpose} conversation=${request.conversationId}`,
      );
    }

    return { data: parseJson<T>(content), usage };
  }

  private async recordUsage(
    request: OpenAiJsonRequest,
    usage: OpenAiUsageMeta,
  ): Promise<void> {
    const estimatedCostUsd = estimateCostUsd(
      usage.model,
      usage.inputTokens,
      usage.outputTokens,
    );
    await this.usageEvents.save(
      this.usageEvents.create({
        tenantId: request.tenantId,
        conversationId: request.conversationId,
        provider: 'openai',
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd,
        purpose: request.purpose,
      }),
    );
    this.logger.log(
      `AI usage purpose=${request.purpose} model=${usage.model} in=${usage.inputTokens} out=${usage.outputTokens} costUsd=${estimatedCostUsd} conversation=${request.conversationId}`,
    );
  }
}

function parseJson<T>(content: string): T {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const raw = fenced?.[1] ?? trimmed;
  return JSON.parse(raw) as T;
}
