import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';
import { toDigits, type WhatsappSender } from './whatsapp-channel';
import { buildTelnyxWhatsappInteractiveListBody } from './telnyx-interactive-list';
import {
  buildTelnyxWhatsappInteractiveButtonBody,
  type WhatsappReplyButtons,
} from './whatsapp-reply-buttons';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildTelnyxWhatsappSendBody(input: {
  from: string;
  to: string;
  body: string;
  messagingProfileId?: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    from: input.from,
    to: input.to,
    type: 'WHATSAPP',
    whatsapp_message: {
      type: 'text',
      text: {
        body: input.body,
        preview_url: false,
      },
    },
  };
  if (input.messagingProfileId) {
    payload.messaging_profile_id = input.messagingProfileId;
  }
  return payload;
}

async function resolveMessagingProfileId(
  apiKey: string,
  fromE164: string,
  configuredProfileId: string | undefined,
  cache: Map<string, string | null>,
): Promise<string | null> {
  const configured = configuredProfileId?.trim();
  if (configured) {
    return configured;
  }
  if (cache.has(fromE164)) {
    return cache.get(fromE164) ?? null;
  }

  const url = new URL('https://api.telnyx.com/v2/phone_numbers/messaging');
  url.searchParams.set('filter[phone_number]', fromE164);
  url.searchParams.set('page[size]', '1');

  let resolved: string | null = null;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (response.ok) {
      const raw = (await response.json()) as unknown;
      if (isRecord(raw) && Array.isArray(raw.data)) {
        for (const entry of raw.data) {
          if (!isRecord(entry)) {
            continue;
          }
          const profileId = entry.messaging_profile_id;
          if (typeof profileId === 'string' && profileId.trim()) {
            resolved = profileId.trim();
            break;
          }
        }
      }
    }
  } catch {
    resolved = null;
  }

  cache.set(fromE164, resolved);
  return resolved;
}

@Injectable()
export class TelnyxWhatsappClient implements WhatsappSender {
  readonly channel = 'telnyx' as const;

  private readonly messagingProfileCache = new Map<string, string | null>();

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
    fromOverride?: string,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const apiKey = this.config.get<string>('TELNYX_API_KEY');
    const configuredFrom = this.config.get<string>('TELNYX_WHATSAPP_FROM');
    const fromRaw = fromOverride?.trim() || configuredFrom;
    if (!apiKey || !fromRaw) {
      throw new Error(
        'TELNYX_API_KEY and TELNYX_WHATSAPP_FROM (or inbound business number) are required',
      );
    }

    const from = toE164(fromRaw);
    const toAddress = toE164(to);

    const messagingProfileId = await resolveMessagingProfileId(
      apiKey,
      from,
      this.config.get<string>('TELNYX_MESSAGING_PROFILE_ID'),
      this.messagingProfileCache,
    );

    const requestBody = buildTelnyxWhatsappSendBody({
      from,
      to: toAddress,
      body,
      messagingProfileId,
    });

    return this.postWhatsappMessage(apiKey, from, messagingProfileId, requestBody);
  }

  async sendInteractiveList(
    to: string,
    list: BaileysListMessageSpec,
    fromOverride?: string,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const apiKey = this.config.get<string>('TELNYX_API_KEY');
    const configuredFrom = this.config.get<string>('TELNYX_WHATSAPP_FROM');
    const fromRaw = fromOverride?.trim() || configuredFrom;
    if (!apiKey || !fromRaw) {
      throw new Error(
        'TELNYX_API_KEY and TELNYX_WHATSAPP_FROM (or inbound business number) are required',
      );
    }

    const from = toE164(fromRaw);
    const toAddress = toE164(to);

    const messagingProfileId = await resolveMessagingProfileId(
      apiKey,
      from,
      this.config.get<string>('TELNYX_MESSAGING_PROFILE_ID'),
      this.messagingProfileCache,
    );

    const requestBody = buildTelnyxWhatsappInteractiveListBody({
      from,
      to: toAddress,
      list,
      messagingProfileId,
    });

    return this.postWhatsappMessage(apiKey, from, messagingProfileId, requestBody);
  }

  async sendInteractiveButtons(
    to: string,
    buttons: WhatsappReplyButtons,
    fromOverride?: string,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const apiKey = this.config.get<string>('TELNYX_API_KEY');
    const configuredFrom = this.config.get<string>('TELNYX_WHATSAPP_FROM');
    const fromRaw = fromOverride?.trim() || configuredFrom;
    if (!apiKey || !fromRaw) {
      throw new Error(
        'TELNYX_API_KEY and TELNYX_WHATSAPP_FROM (or inbound business number) are required',
      );
    }

    const from = toE164(fromRaw);
    const toAddress = toE164(to);
    const messagingProfileId = await resolveMessagingProfileId(
      apiKey,
      from,
      this.config.get<string>('TELNYX_MESSAGING_PROFILE_ID'),
      this.messagingProfileCache,
    );
    const requestBody = buildTelnyxWhatsappInteractiveButtonBody({
      from,
      to: toAddress,
      buttons,
      messagingProfileId,
    });
    return this.postWhatsappMessage(apiKey, from, messagingProfileId, requestBody);
  }

  private async postWhatsappMessage(
    apiKey: string,
    from: string,
    messagingProfileId: string | null,
    requestBody: Record<string, unknown>,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const response = await fetch('https://api.telnyx.com/v2/messages/whatsapp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let raw: unknown = null;
    const responseText = await response.text();
    try {
      raw = JSON.parse(responseText) as unknown;
    } catch {
      raw = responseText;
    }

    if (!response.ok) {
      const bodyText =
        typeof raw === 'string' ? raw : JSON.stringify(raw);
      const hint =
        bodyText.includes('10004') || bodyText.includes('Invalid source number')
          ? ` Telnyx rejected from=${from} (profile=${messagingProfileId ?? 'none'}). Set TELNYX_MESSAGING_PROFILE_ID to the WhatsApp messaging profile UUID and assign your WhatsApp number under Messaging → WhatsApp → Manage Numbers in the Telnyx portal.`
          : '';
      throw new TelnyxSendError(
        response.status,
        `${bodyText}${hint}`,
      );
    }

    return { messageId: readTelnyxMessageId(raw), raw };
  }
}
