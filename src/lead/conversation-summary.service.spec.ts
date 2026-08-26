import { OpenAiClientService } from '../ai-orchestrator/openai-client.service';
import { ConversationService } from '../conversation/conversation.service';
import { ConversationSummaryService } from './conversation-summary.service';
import { LeadProfileService } from './lead-profile.service';

describe('ConversationSummaryService', () => {
  const conversations = {
    findById: jest.fn(),
    listMessages: jest.fn(),
  };
  const profiles = {
    findByConversationId: jest.fn(),
  };
  const openai = {
    completeJson: jest.fn(),
  };

  const service = new ConversationSummaryService(
    conversations as unknown as ConversationService,
    profiles as unknown as LeadProfileService,
    openai as unknown as OpenAiClientService,
  );

  beforeEach(() => {
    conversations.findById.mockReset();
    conversations.listMessages.mockReset();
    profiles.findByConversationId.mockReset();
    openai.completeJson.mockReset();
  });

  it('asks OpenAI for a summary with purpose conversation_summary', async () => {
    conversations.findById.mockResolvedValue({
      id: 'conv-1',
      tenantId: 'tenant-1',
    });
    conversations.listMessages.mockResolvedValue([
      { direction: 'in', text: 'I own a salon' },
      { direction: 'out', text: 'Try the demo' },
    ]);
    profiles.findByConversationId.mockResolvedValue({
      businessName: 'Glow Salon',
      dailyEnquiryVolume: 50,
      painPoint: 'Night backlog',
    });
    openai.completeJson.mockResolvedValue({
      data: {
        summary: 'Glow Salon tried the salon demo and has a night backlog.',
      },
      usage: { inputTokens: 20, outputTokens: 12, model: 'gpt-4o-mini' },
    });

    await expect(service.summarize('conv-1')).resolves.toBe(
      'Glow Salon tried the salon demo and has a night backlog.',
    );
    expect(openai.completeJson).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'conversation_summary',
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
      }),
    );
  });
});
