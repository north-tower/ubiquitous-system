import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type WhatsappSender } from './whatsapp-channel';

export class MetaSendError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Meta WhatsApp send failed (${status}): ${body}`);
    this.name = 'MetaSendError';
  }
}

@Injectable()
export class MetaWhatsappClient implements WhatsappSender {
  readonly channel = 'meta' as const;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('META_ACCESS_TOKEN') &&
      this.config.get<string>('META_PHONE_NUMBER_ID'),
    );
  }

  async sendText(
    to: string,
    body: string,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const token = this.config.get<string>('META_ACCESS_TOKEN');
    const phoneNumberId = this.config.get<string>('META_PHONE_NUMBER_ID');
    if (!token || !phoneNumberId) {
      throw new Error(
        'META_ACCESS_TOKEN and META_PHONE_NUMBER_ID are required to send WhatsApp messages',
      );
    }

    const version =
      this.config.get<string>('META_GRAPH_API_VERSION') ?? 'v21.0';
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    });

    let raw: unknown = null;
    try {
      raw = JSON.parse(await response.text()) as unknown;
    } catch {
      raw = null;
    }
    if (!response.ok) {
      throw new MetaSendError(response.status, JSON.stringify(raw));
    }

    const messageId = readMetaMessageId(raw);

    return { messageId, raw };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readMetaMessageId(raw: unknown): string | null {
  if (!isRecord(raw) || !Array.isArray(raw.messages)) {
    return null;
  }
  const first: unknown = raw.messages[0];
  if (!isRecord(first) || typeof first.id !== 'string') {
    return null;
  }
  return first.id;
}
