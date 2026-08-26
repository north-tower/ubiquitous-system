import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationService } from '../conversation/conversation.service';
import { type WhatsappChannel } from './whatsapp-channel';
import { WhatsappSendRouter } from './whatsapp-send.router';

export type OutboundTextJob = {
  conversationId: string;
  to: string;
  text: string;
  channel?: WhatsappChannel;
};

@Injectable()
export class OutboundMessageService {
  private readonly logger = new Logger(OutboundMessageService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly router: WhatsappSendRouter,
    private readonly conversations: ConversationService,
  ) {}

  async sendText(job: OutboundTextJob): Promise<void> {
    if (
      this.config.get<string>('NODE_ENV') === 'test' ||
      this.config.get<string>('META_SKIP_SEND') === 'true' ||
      this.config.get<string>('WHATSAPP_SKIP_SEND') === 'true'
    ) {
      await this.conversations.recordOutbound({
        conversationId: job.conversationId,
        text: job.text,
        rawPayload: { skipped: true, channel: job.channel ?? null },
      });
      this.logger.warn(
        `Skipped WhatsApp send (test/skip) conversation=${job.conversationId} channel=${job.channel ?? 'auto'}`,
      );
      return;
    }
    const { channel, messageId, raw } = await this.router.sendText(
      job.to,
      job.text,
      job.channel,
    );
    await this.conversations.recordOutbound({
      conversationId: job.conversationId,
      text: job.text,
      rawPayload: { channel, messageId, response: raw },
    });
    this.logger.log(
      `Sent WhatsApp text conversation=${job.conversationId} to=${job.to} channel=${channel}`,
    );
  }

  async sendAll(jobs: OutboundTextJob[]): Promise<void> {
    for (const job of jobs) {
      try {
        await this.sendText(job);
      } catch (error) {
        this.logger.error(
          `Failed to send WhatsApp text conversation=${job.conversationId} to=${job.to}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
