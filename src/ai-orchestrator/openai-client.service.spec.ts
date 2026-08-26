import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { Repository } from 'typeorm';
import { AIUsageEvent } from './ai-usage-event.entity';
import { OpenAiClientService } from './openai-client.service';

describe('OpenAiClientService', () => {
  const create = jest.fn();
  const openai = {
    chat: { completions: { create } },
  };
  const usageEvents = {
    create: jest.fn((value: Partial<AIUsageEvent>) => value),
    save: jest.fn(),
  };
  const env: Record<string, string | undefined> = {
    OPENAI_MODEL: 'gpt-4o-mini',
  };
  const config = {
    get: (key: string) => env[key],
  };

  const client = new OpenAiClientService(
    openai as unknown as OpenAI,
    config as unknown as ConfigService,
    usageEvents as unknown as Repository<AIUsageEvent>,
  );

  beforeEach(() => {
    env.OPENAI_MODEL = 'gpt-4o-mini';
    create.mockReset();
    usageEvents.create.mockClear();
    usageEvents.save.mockReset();
    usageEvents.save.mockResolvedValue({});
  });

  it('returns parsed JSON plus usage and writes an AIUsageEvent', async () => {
    create.mockResolvedValue({
      model: 'gpt-4o-mini',
      usage: { prompt_tokens: 1000, completion_tokens: 1000 },
      choices: [{ message: { content: '{"mode":"salon","confidence":0.9}' } }],
    });

    const result = await client.completeJson<{
      mode: string;
      confidence: number;
    }>({
      purpose: 'industry_classification',
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
      schemaName: 'industry_classification',
      schema: { type: 'object' },
      systemPrompt: 'classify',
      userPrompt: 'I own a salon',
    });

    expect(result.data).toEqual({ mode: 'salon', confidence: 0.9 });
    expect(result.usage).toEqual({
      inputTokens: 1000,
      outputTokens: 1000,
      model: 'gpt-4o-mini',
    });
    expect(create).toHaveBeenCalledTimes(1);
    const calls = create.mock.calls as unknown as Array<
      [{ model: string; response_format: { type: string } }]
    >;
    expect(calls[0][0].model).toBe('gpt-4o-mini');
    expect(calls[0][0].response_format.type).toBe('json_schema');
  });

  it('uses json_object for gpt-4-turbo which does not support json_schema', async () => {
    env.OPENAI_MODEL = 'gpt-4-turbo';
    create.mockResolvedValue({
      model: 'gpt-4-turbo',
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      choices: [
        { message: { content: '{"mode":"generic","confidence":0.7}' } },
      ],
    });

    await client.completeJson({
      purpose: 'industry_classification',
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
      schemaName: 'industry_classification',
      schema: { type: 'object' },
      systemPrompt: 'classify',
      userPrompt: 'hardware store',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4-turbo',
        response_format: { type: 'json_object' },
      }),
    );
  });
});
