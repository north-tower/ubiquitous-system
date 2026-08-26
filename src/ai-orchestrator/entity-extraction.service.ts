import { Injectable, Logger } from '@nestjs/common';
import { extractionSchemaFor } from './entity-extraction.schemas';
import { OpenAiClientService } from './openai-client.service';
import { AI_PURPOSE } from './openai.constants';

export type ExtractionContext = {
  conversationId: string;
  tenantId: string;
};

@Injectable()
export class EntityExtractionService {
  private readonly logger = new Logger(EntityExtractionService.name);

  constructor(private readonly openai: OpenAiClientService) {}

  async extract(
    demoMode: string,
    step: string,
    freeText: string,
    context: ExtractionContext,
  ): Promise<Record<string, any>> {
    const spec = extractionSchemaFor(demoMode, step);
    if (!spec) {
      this.logger.warn(
        `No extraction schema mode=${demoMode} step=${step} conversation=${context.conversationId}`,
      );
      return {};
    }

    const { data } = await this.openai.completeJson<Record<string, any>>({
      purpose: AI_PURPOSE.ENTITY_EXTRACTION,
      conversationId: context.conversationId,
      tenantId: context.tenantId,
      schemaName: spec.schemaName,
      schema: spec.schema,
      systemPrompt: spec.systemPrompt,
      userPrompt: freeText,
    });

    this.logger.log(
      `AI-fallback extraction mode=${demoMode} step=${step} conversation=${context.conversationId}`,
    );
    return data ?? {};
  }
}
