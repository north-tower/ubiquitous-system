import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isTwilioContentSendDebug,
  maskWhatsappAddress,
  previewContentVariables,
  summarizeContentVariables,
} from './twilio-content-send-debug';
import { toWhatsappAddress, type WhatsappSender } from './whatsapp-channel';

export type TwilioContentRequestSummary = {
  contentSid: string;
  contentVariablesJson: string | null;
  variableSummary: ReturnType<typeof summarizeContentVariables>;
  to: string;
  from: string;
};

export class TwilioSendError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly contentRequest?: TwilioContentRequestSummary,
  ) {
    super(`Twilio WhatsApp send failed (${status}): ${body}`);
    this.name = 'TwilioSendError';
  }
}

/** Parses Twilio REST error `code` from a TwilioSendError body (JSON string). */
export function twilioSendErrorCode(error: unknown): number | null {
  if (!(error instanceof TwilioSendError)) {
    return null;
  }
  try {
    const parsed = JSON.parse(error.body) as { code?: unknown };
    return typeof parsed.code === 'number' ? parsed.code : null;
  } catch {
    return null;
  }
}

@Injectable()
export class TwilioWhatsappClient implements WhatsappSender {
  readonly channel = 'twilio' as const;
  private readonly logger = new Logger(TwilioWhatsappClient.name);

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
    return this.postMessage(to, { Body: body });
  }

  async sendContent(
    to: string,
    contentSid: string,
    contentVariables?: Record<string, string>,
  ): Promise<{ messageId: string | null; raw: unknown }> {
    const fields: Record<string, string> = { ContentSid: contentSid };
    const variableSummary = summarizeContentVariables(contentVariables);
    if (contentVariables && variableSummary.count > 0) {
      fields.ContentVariables = JSON.stringify(contentVariables);
    }
    const from = this.config.get<string>('TWILIO_WHATSAPP_FROM') ?? '';
    const contentRequest: TwilioContentRequestSummary = {
      contentSid,
      contentVariablesJson: fields.ContentVariables ?? null,
      variableSummary,
      to: maskWhatsappAddress(to),
      from: maskWhatsappAddress(from),
    };
    if (isTwilioContentSendDebug(this.config)) {
      this.logger.debug(
        `Twilio content POST contentSid=${contentSid} to=${contentRequest.to} vars=${JSON.stringify(variableSummary)} preview=${JSON.stringify(previewContentVariables(contentVariables))}`,
      );
    }
    return this.postMessage(to, fields, contentRequest);
  }

  private async postMessage(
    to: string,
    fields: Record<string, string>,
    contentRequest?: TwilioContentRequestSummary,
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
      ...fields,
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
      throw new TwilioSendError(
        response.status,
        JSON.stringify(raw),
        contentRequest,
      );
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
