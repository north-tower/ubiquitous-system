import { IndustryClassifierService } from './industry-classifier.service';
import { OpenAiClientService } from './openai-client.service';

describe('IndustryClassifierService', () => {
  const openai = {
    completeJson: jest.fn(),
  };
  const classifier = new IndustryClassifierService(
    openai as unknown as OpenAiClientService,
  );
  const ctx = { conversationId: 'conv-1', tenantId: 'tenant-1' };

  beforeEach(() => {
    openai.completeJson.mockReset();
  });

  it('maps a salon-like sentence to salon', async () => {
    openai.completeJson.mockResolvedValue({
      data: { mode: 'salon', confidence: 0.93 },
      usage: { inputTokens: 10, outputTokens: 5, model: 'gpt-4o-mini' },
    });

    await expect(classifier.classify('I own a salon', ctx)).resolves.toEqual({
      mode: 'salon',
      confidence: 0.93,
    });
    expect(openai.completeJson).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'industry_classification',
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        userPrompt: 'I own a salon',
      }),
    );
  });

  it('maps an unrecognized business to generic', async () => {
    openai.completeJson.mockResolvedValue({
      data: { mode: 'generic', confidence: 0.81 },
      usage: { inputTokens: 10, outputTokens: 5, model: 'gpt-4o-mini' },
    });

    await expect(
      classifier.classify('I run a hardware store', ctx),
    ).resolves.toEqual({
      mode: 'generic',
      confidence: 0.81,
    });
  });

  it('coerces an invented mode string to generic', async () => {
    openai.completeJson.mockResolvedValue({
      data: { mode: 'hardware', confidence: 0.5 },
      usage: { inputTokens: 10, outputTokens: 5, model: 'gpt-4o-mini' },
    });

    await expect(
      classifier.classify('I run a hardware store', ctx),
    ).resolves.toEqual({
      mode: 'generic',
      confidence: 0.5,
    });
  });
});
