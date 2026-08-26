import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  ): Promise<WhatsappSendResult> {
    const order = this.order(preferred);
    if (order.length === 0) {
      throw new Error(
        'No WhatsApp provider is configured. Set Meta or Twilio credentials.',
      );
    }

    const failover =
      this.config.get<string>('WHATSAPP_SEND_FAILOVER') === 'true';

    let lastError: unknown;
    for (const [index, sender] of order.entries()) {
      try {
        const result = await sender.sendText(to, body);
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
    if (this.primaryChannel() === 'twilio') {
      return [this.twilio, this.meta];
    }
    return [this.meta, this.twilio];
  }

  private primaryChannel(): WhatsappChannel {
    return this.config.get<string>('WHATSAPP_PRIMARY_CHANNEL') === 'meta'
      ? 'meta'
      : 'twilio';
  }
}
