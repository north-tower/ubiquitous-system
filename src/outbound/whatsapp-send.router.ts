import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';
import { BaileysWhatsappClient } from './baileys-whatsapp.client';
import { MetaWhatsappClient } from './meta-whatsapp.client';
import type { TelnyxReplyButtonSpec } from './telnyx-interactive-button';
import { TelnyxWhatsappClient } from './telnyx-whatsapp.client';
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
    private readonly telnyx: TelnyxWhatsappClient,
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
    telnyxFrom?: string,
  ): Promise<WhatsappSendResult> {
    const order = this.order(preferred);
    if (order.length === 0) {
      throw new Error(
        'No WhatsApp provider is configured. Set Baileys, Meta, Twilio, or Telnyx credentials.',
      );
    }

    const failover =
      this.config.get<string>('WHATSAPP_SEND_FAILOVER') === 'true';

    let lastError: unknown;
    for (const [index, sender] of order.entries()) {
      try {
        const result =
          sender.channel === 'telnyx'
            ? await this.telnyx.sendText(to, body, telnyxFrom)
            : sender.channel === 'baileys' && tenantId
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

  async sendBaileysList(
    to: string,
    list: BaileysListMessageSpec,
    tenantId?: string,
  ): Promise<WhatsappSendResult> {
    if (!this.baileys.isConfigured()) {
      throw new Error('Baileys is not configured.');
    }
    const result = await this.baileys.sendList(to, list, tenantId);
    return { channel: 'baileys', ...result };
  }

  async sendTelnyxList(
    to: string,
    list: BaileysListMessageSpec,
    telnyxFrom?: string,
  ): Promise<WhatsappSendResult> {
    if (!this.telnyx.isConfigured()) {
      throw new Error('Telnyx is not configured.');
    }
    const result = await this.telnyx.sendInteractiveList(to, list, telnyxFrom);
    return { channel: 'telnyx', ...result };
  }

  async sendTelnyxButtons(
    to: string,
    buttons: TelnyxReplyButtonSpec,
    telnyxFrom?: string,
  ): Promise<WhatsappSendResult> {
    if (!this.telnyx.isConfigured()) {
      throw new Error('Telnyx is not configured.');
    }
    const result = await this.telnyx.sendInteractiveButtons(
      to,
      buttons,
      telnyxFrom,
    );
    return { channel: 'telnyx', ...result };
  }

  async sendContent(
    to: string,
    contentSid: string,
    contentVariables?: Record<string, string>,
  ): Promise<WhatsappSendResult> {
    if (!this.twilio.isConfigured()) {
      throw new Error(
        'Twilio is not configured. A list template can only be sent through Twilio.',
      );
    }
    const result = await this.twilio.sendContent(
      to,
      contentSid,
      contentVariables,
    );
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
    const order: WhatsappChannel[] =
      this.primaryChannel() === 'baileys'
        ? ['baileys', 'meta', 'twilio', 'telnyx']
        : this.primaryChannel() === 'meta'
          ? ['meta', 'twilio', 'telnyx', 'baileys']
          : this.primaryChannel() === 'telnyx'
            ? ['telnyx', 'twilio', 'meta', 'baileys']
            : ['twilio', 'telnyx', 'meta', 'baileys'];
    const byChannel = new Map(
      this.allSenders().map((sender) => [sender.channel, sender]),
    );
    return order
      .map((channel) => byChannel.get(channel))
      .filter((sender): sender is WhatsappSender => sender !== undefined);
  }

  private allSenders(): WhatsappSender[] {
    return [this.baileys, this.meta, this.twilio, this.telnyx];
  }

  private primaryChannel(): WhatsappChannel {
    const configured = this.config.get<string>('WHATSAPP_PRIMARY_CHANNEL');
    if (
      configured === 'meta' ||
      configured === 'baileys' ||
      configured === 'telnyx'
    ) {
      return configured;
    }
    return 'twilio';
  }
}
