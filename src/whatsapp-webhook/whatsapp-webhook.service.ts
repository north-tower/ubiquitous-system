import {
  ForbiddenException,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOrchestratorService } from '../ai-orchestrator/ai-orchestrator.service';
import { ConversationService } from '../conversation/conversation.service';
import { EnquiryFlowService } from '../enquiry-flow/enquiry-flow.service';
import {
  BaileysWhatsappClient,
  type BaileysInboundNotice,
} from '../outbound/baileys-whatsapp.client';
import { OutboundMessageService } from '../outbound/outbound-message.service';
import { DEFAULT_TENANT_FLOW } from '../tenant/tenant-flow';
import { TenantResolverService } from '../tenant/tenant-resolver.service';
import { parseInboundWebhook } from './parse-inbound';
import { parseTwilioWebhook } from './parse-twilio';

@Injectable()
export class WhatsappWebhookService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tenantResolver: TenantResolverService,
    private readonly conversations: ConversationService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly enquiryFlow: EnquiryFlowService,
    private readonly outbound: OutboundMessageService,
    private readonly baileys: BaileysWhatsappClient,
  ) {}

  onModuleInit(): void {
    this.baileys.setInboundHandler((message) =>
      this.handleBaileysInbound(message),
    );
  }

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
        flow: tenant.flow ?? DEFAULT_TENANT_FLOW,
        phoneNumber: item.phoneNumber,
        text: item.text,
        raw: item.raw,
        channel: 'meta',
      });
    }
  }

  async handleBaileysInbound(input: BaileysInboundNotice): Promise<void> {
    const tenant = await this.tenantResolver.resolveById(input.tenantId);
    if (!tenant) {
      this.logger.warn(
        `No tenant for Baileys inbound tenant=${input.tenantId}`,
      );
      return;
    }

    try {
      await this.processInbound({
        tenantId: tenant.id,
        flow: tenant.flow ?? DEFAULT_TENANT_FLOW,
        phoneNumber: input.phoneNumber,
        text: input.text,
        raw: input.raw,
        channel: 'baileys',
      });
    } catch (error) {
      this.logger.error(
        `Baileys inbound processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
        flow: tenant.flow ?? DEFAULT_TENANT_FLOW,
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
    flow: string;
    phoneNumber: string;
    text: string | null;
    raw: unknown;
    channel: 'meta' | 'twilio' | 'baileys';
  }): Promise<void> {
    const { conversation } = await this.conversations.recordInbound({
      tenantId: input.tenantId,
      phoneNumber: input.phoneNumber,
      text: input.text,
      raw: input.raw,
    });

    let replyText: string;
    let list: 'event_type' | undefined;
    if (input.flow === 'enquiry_intake') {
      const reply = await this.enquiryFlow.handleInbound(
        conversation,
        input.text,
      );
      replyText = reply.replyText;
      list = reply.list;
    } else {
      replyText = (
        await this.orchestrator.handleInboundMessage(
          conversation.id,
          input.text,
        )
      ).replyText;
    }

    await this.outbound.sendAll([
      {
        conversationId: conversation.id,
        to: input.phoneNumber,
        text: replyText,
        channel: input.channel,
        tenantId: input.tenantId,
        ...(list ? { list } : {}),
      },
    ]);
  }
}
