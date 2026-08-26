import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toWhatsappAddress, type WhatsappSender } from './whatsapp-channel';

export class TwilioSendError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Twilio WhatsApp send failed (${status}): ${body}`);
    this.name = 'TwilioSendError';
  }
}

@Injectable()
export class TwilioWhatsappClient implements WhatsappSender {
  readonly channel = 'twilio' as const;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('TWILIO_ACCOUNT_SID') &&
      this.config.get<string>('TWILIO_AUTH_TOKEN') &&
      this.config.get<string>('TWILIO_WHATSAPP_FROM'),
    );
  }

  async sendText(
    to: string,
    body: string,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.config.get<string>('TWILIO_WHATSAPP_FROM');
    if (!accountSid || !token || !from) {
      throw new Error(
        'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM are required',
      );
    }

    const params = new URLSearchParams({
      From: from.startsWith('whatsapp:') ? from : toWhatsappAddress(from),
      To: toWhatsappAddress(to),
      Body: body,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    );

    let raw: unknown = null;
    try {
      raw = JSON.parse(await response.text()) as unknown;
    } catch {
      raw = null;
    }
    if (!response.ok) {
      throw new TwilioSendError(response.status, JSON.stringify(raw));
    }

    return { messageId: readTwilioSid(raw), raw };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readTwilioSid(raw: unknown): string | null {
  if (!isRecord(raw) || typeof raw.sid !== 'string') {
    return null;
  }
  return raw.sid;
}
