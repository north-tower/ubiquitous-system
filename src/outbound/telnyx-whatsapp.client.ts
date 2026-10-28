import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toDigits, type WhatsappSender } from './whatsapp-channel';

export class TelnyxSendError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Telnyx WhatsApp send failed (${status}): ${body}`);
    this.name = 'TelnyxSendError';
  }
}

function toE164(phone: string): string {
  const trimmed = phone.trim();
  if (/^[A-Z]{2}\./.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  const digits = toDigits(trimmed);
  if (!digits) {
    throw new Error('Recipient phone number is required');
  }
  return `+${digits}`;
}

function readTelnyxMessageId(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const data = (raw as Record<string, unknown>).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const id = (data as Record<string, unknown>).id;
  return typeof id === 'string' ? id : null;
}

@Injectable()
export class TelnyxWhatsappClient implements WhatsappSender {
  readonly channel = 'telnyx' as const;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('TELNYX_API_KEY') &&
        this.config.get<string>('TELNYX_WHATSAPP_FROM'),
    );
  }

  async sendText(
    to: string,
    body: string,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const apiKey = this.config.get<string>('TELNYX_API_KEY');
    const from = this.config.get<string>('TELNYX_WHATSAPP_FROM');
    if (!apiKey || !from) {
      throw new Error(
        'TELNYX_API_KEY and TELNYX_WHATSAPP_FROM are required',
      );
    }

    const response = await fetch('https://api.telnyx.com/v2/messages/whatsapp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: toE164(from),
        to: toE164(to),
        whatsapp_message: {
          type: 'text',
          text: {
            body,
            preview_url: false,
          },
        },
      }),
    });

    let raw: unknown = null;
    const responseText = await response.text();
    try {
      raw = JSON.parse(responseText) as unknown;
    } catch {
      raw = responseText;
    }

    if (!response.ok) {
      throw new TelnyxSendError(
        response.status,
        typeof raw === 'string' ? raw : JSON.stringify(raw),
      );
    }

    return { messageId: readTelnyxMessageId(raw), raw };
  }
}
