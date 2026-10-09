import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationService } from '../conversation/conversation.service';
import { TenantService } from '../tenant/tenant.service';
import { type WhatsappChannel } from './whatsapp-channel';
import { WhatsappSendRouter } from './whatsapp-send.router';

export type OutboundTextJob = {
  conversationId: string;
  to: string;
  text: string;
  channel?: WhatsappChannel;
  /** Baileys replies go out on the socket that received the inbound message. */
  tenantId?: string;
  /** Twilio list-picker. Sent only when that channel is Twilio and the matching Content SID is set. */
  list?: 'event_type';
};

@Injectable()
export class OutboundMessageService {
  private readonly logger = new Logger(OutboundMessageService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly router: WhatsappSendRouter,
    private readonly conversations: ConversationService,
    private readonly tenants: TenantService,
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
    const contentSid = this.listContentSid(job);
    if (contentSid) {
      try {
        const { channel, messageId, raw } = await this.router.sendContent(
          job.to,
          contentSid,
        );
        await this.conversations.recordOutbound({
          conversationId: job.conversationId,
          text: job.text,
          rawPayload: { channel, messageId, contentSid, response: raw },
        });
        this.logger.log(
          `Sent WhatsApp list conversation=${job.conversationId} to=${job.to} channel=${channel}`,
        );
        return;
      } catch (error) {
        this.logger.error(
          `WhatsApp list send failed, falling back to text conversation=${job.conversationId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const channel = await this.resolveSendChannel(job);
    const { channel: usedChannel, messageId, raw } = await this.router.sendText(
      job.to,
      job.text,
      channel,
      job.tenantId,
    );
    await this.conversations.recordOutbound({
      conversationId: job.conversationId,
      text: job.text,
      rawPayload: { channel: usedChannel, messageId, response: raw },
    });
    this.logger.log(
      `Sent WhatsApp text conversation=${job.conversationId} to=${job.to} channel=${usedChannel}`,
    );
  }

  private async resolveSendChannel(
    job: OutboundTextJob,
  ): Promise<WhatsappChannel | undefined> {
    if (job.channel) {
      return job.channel;
    }
    if (!job.tenantId) {
      return undefined;
    }
    const tenant = await this.tenants.findById(job.tenantId);
    const primary = tenant?.primaryChannel;
    if (primary === 'baileys' || primary === 'twilio') {
      return primary;
    }
    return undefined;
  }

  private listContentSid(job: OutboundTextJob): string | null {
    if (
      job.list !== 'event_type' ||
      job.channel === 'meta' ||
      job.channel === 'baileys'
    ) {
      return null;
    }
    const sid = this.config
      .get<string>('TWILIO_EVENT_TYPE_CONTENT_SID')
      ?.trim();
    return sid ? sid : null;
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
