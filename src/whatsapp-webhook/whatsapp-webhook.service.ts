import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOrchestratorService } from '../ai-orchestrator/ai-orchestrator.service';
import { ConversationService } from '../conversation/conversation.service';
import { OutboundMessageService } from '../outbound/outbound-message.service';
import { TenantResolverService } from '../tenant/tenant-resolver.service';
import { parseInboundWebhook } from './parse-inbound';
import { parseTwilioWebhook } from './parse-twilio';

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tenantResolver: TenantResolverService,
    private readonly conversations: ConversationService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly outbound: OutboundMessageService,
  ) {}

  verifySubscription(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string {
    const expected = this.config.getOrThrow<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === expected && challenge) {
      return challenge;
    }
    throw new ForbiddenException('Webhook verification failed');
  }

  async handleInbound(body: unknown): Promise<void> {
    const parsed = parseInboundWebhook(body);

    for (const item of parsed) {
      const tenant = await this.tenantResolver.resolveByWhatsappPhoneNumberId(
        item.metaPhoneNumberId,
      );
      if (!tenant) {
        this.logger.warn(
          `No tenant for whatsapp_phone_number_id=${item.metaPhoneNumberId}`,
        );
        continue;
      }

      await this.processInbound({
        tenantId: tenant.id,
        phoneNumber: item.phoneNumber,
        text: item.text,
        raw: item.raw,
        channel: 'meta',
      });
    }
  }

  async handleTwilioInbound(body: unknown): Promise<void> {
    const parsed = parseTwilioWebhook(body);
    if (!parsed) {
      this.logger.warn('Twilio webhook had no usable WhatsApp message');
      return;
    }

    const tenant = await this.tenantResolver.resolveDefault();
    if (!tenant) {
      this.logger.warn('No default tenant for Twilio inbound');
      return;
    }

    try {
      await this.processInbound({
        tenantId: tenant.id,
        phoneNumber: parsed.phoneNumber,
        text: parsed.text,
        raw: parsed.raw,
        channel: 'twilio',
      });
    } catch (error) {
      this.logger.error(
        `Twilio inbound processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async processInbound(input: {
    tenantId: string;
    phoneNumber: string;
    text: string | null;
    raw: unknown;
    channel: 'meta' | 'twilio';
  }): Promise<void> {
    const { conversation } = await this.conversations.recordInbound({
      tenantId: input.tenantId,
      phoneNumber: input.phoneNumber,
      text: input.text,
      raw: input.raw,
    });

    const { replyText } = await this.orchestrator.handleInboundMessage(
      conversation.id,
      input.text,
    );

    await this.outbound.sendAll([
      {
        conversationId: conversation.id,
        to: input.phoneNumber,
        text: replyText,
        channel: input.channel,
      },
    ]);
  }
}
