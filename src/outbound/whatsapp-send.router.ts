import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaileysWhatsappClient } from './baileys-whatsapp.client';
import { MetaWhatsappClient } from './meta-whatsapp.client';
import { TwilioWhatsappClient } from './twilio-whatsapp.client';
import {
  type WhatsappChannel,
  type WhatsappSendResult,
  type WhatsappSender,
} from './whatsapp-channel';

@Injectable()
export class WhatsappSendRouter {
  constructor(
    private readonly config: ConfigService,
    private readonly meta: MetaWhatsappClient,
    private readonly twilio: TwilioWhatsappClient,
    private readonly baileys: BaileysWhatsappClient,
  ) {}

  configuredChannels(): WhatsappChannel[] {
    return this.senders()
      .filter((sender) => sender.isConfigured())
      .map((sender) => sender.channel);
  }

  async sendText(
    to: string,
    body: string,
    preferred?: WhatsappChannel,
    tenantId?: string,
  ): Promise<WhatsappSendResult> {
    const order = this.order(preferred);
    if (order.length === 0) {
      throw new Error(
        'No WhatsApp provider is configured. Set Baileys, Meta, or Twilio credentials.',
      );
    }

    const failover =
      this.config.get<string>('WHATSAPP_SEND_FAILOVER') === 'true';

    let lastError: unknown;
    for (const [index, sender] of order.entries()) {
      try {
        const result =
          sender.channel === 'baileys' && tenantId
            ? await sender.sendText(to, body, tenantId)
            : await sender.sendText(to, body);
        return { channel: sender.channel, ...result };
      } catch (error) {
        lastError = error;
        const hasNext = failover && index < order.length - 1;
        if (!hasNext) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('WhatsApp send failed');
  }

  async sendContent(
    to: string,
    contentSid: string,
  ): Promise<WhatsappSendResult> {
    if (!this.twilio.isConfigured()) {
      throw new Error(
        'Twilio is not configured. A list template can only be sent through Twilio.',
      );
    }
    const result = await this.twilio.sendContent(to, contentSid);
    return { channel: 'twilio', ...result };
  }

  private order(preferred?: WhatsappChannel): WhatsappSender[] {
    const configured = this.senders().filter((sender) => sender.isConfigured());
    const failover =
      this.config.get<string>('WHATSAPP_SEND_FAILOVER') === 'true';
    if (!preferred) {
      return configured;
    }
    const first = configured.filter((sender) => sender.channel === preferred);
    if (first.length === 0) {
      if (failover) {
        return configured;
      }
      throw new Error(`WhatsApp provider "${preferred}" is not configured`);
    }
    if (!failover) {
      return first;
    }
    const rest = configured.filter((sender) => sender.channel !== preferred);
    return [...first, ...rest];
  }

  private senders(): WhatsappSender[] {
    const primary = this.primaryChannel();
    if (primary === 'baileys') {
      return [this.baileys, this.meta, this.twilio];
    }
    if (primary === 'meta') {
      return [this.meta, this.twilio, this.baileys];
    }
    return [this.twilio, this.meta, this.baileys];
  }

  private primaryChannel(): WhatsappChannel {
    const configured = this.config.get<string>('WHATSAPP_PRIMARY_CHANNEL');
    if (configured === 'meta' || configured === 'baileys') {
      return configured;
    }
    return 'twilio';
  }
}
