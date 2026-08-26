import { Injectable, Logger } from '@nestjs/common';
import { OpenAiClientService } from '../ai-orchestrator/openai-client.service';
import { AI_PURPOSE } from '../ai-orchestrator/openai.constants';
import { ConversationService } from '../conversation/conversation.service';
import { LeadProfileService } from './lead-profile.service';

const SUMMARY_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
  },
  required: ['summary'],
};

@Injectable()
export class ConversationSummaryService {
  private readonly logger = new Logger(ConversationSummaryService.name);

  constructor(
    private readonly conversations: ConversationService,
    private readonly profiles: LeadProfileService,
    private readonly openai: OpenAiClientService,
  ) {}

  async summarize(conversationId: string): Promise<string> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    const messages = await this.conversations.listMessages(conversationId);
    const profile = await this.profiles.findByConversationId(conversationId);

    const transcript = messages
      .map((message) => {
        const who = message.direction === 'in' ? 'Prospect' : 'Bot';
        return `${who}: ${message.text ?? ''}`;
      })
      .join('\n');

    const { data } = await this.openai.completeJson<{ summary: string }>({
      purpose: AI_PURPOSE.CONVERSATION_SUMMARY,
      conversationId,
      tenantId: conversation.tenantId,
      schemaName: 'conversation_summary',
      schema: SUMMARY_SCHEMA,
      systemPrompt: [
        'Summarize this WhatsApp demo conversation for a salesperson in 2-3 sentences.',
        'Cover the simulated demo they tried, the business facts we collected, and the likely fit.',
        'Do not invent facts that are not in the transcript or lead fields.',
      ].join(' '),
      userPrompt: [
        'Lead fields:',
        JSON.stringify({
          businessName: profile?.businessName ?? null,
          dailyEnquiryVolume: profile?.dailyEnquiryVolume ?? null,
          currentProcess: profile?.currentProcess ?? null,
          staffCount: profile?.staffCount ?? null,
          existingSystem: profile?.existingSystem ?? null,
          painPoint: profile?.painPoint ?? null,
        }),
        '',
        'Transcript:',
        transcript || '(no messages)',
      ].join('\n'),
    });

    const summary = data.summary?.trim();
    if (!summary) {
      throw new Error(
        `Empty conversation summary for conversation ${conversationId}`,
      );
    }
    this.logger.log(
      `Wrote conversation summary conversation=${conversationId}`,
    );
    return summary;
  }
}
