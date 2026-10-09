export type ParsedTwilioInbound = {
  waId: string;
  phoneNumber: string;
  text: string | null;
  messageSid: string | null;
  raw: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0]) {
    return value[0];
  }
  return null;
}

function formFields(body: unknown): Record<string, string> | null {
  if (!isRecord(body)) {
    return null;
  }
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    const text = asString(value);
    if (text !== null) {
      fields[key] = text;
    }
  }
  return fields;
}

function toDigits(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

import { parseServicesFlowInbound } from '../enquiry-flow/parse-services-flow-response';

/** Flow submission, list-picker row id, quick-reply ButtonPayload, or Body. */
function readTwilioInboundChoice(fields: Record<string, string>): string | null {
  for (const key of ['InteractiveData', 'FlowData'] as const) {
    const raw = fields[key]?.trim();
    if (!raw) {
      continue;
    }
    const services = parseServicesFlowInbound(raw);
    if (services) {
      return services;
    }
  }

  const listId = fields.ListId?.trim();
  if (listId) {
    return listId;
  }
  const payload = fields.ButtonPayload?.trim();
  if (payload) {
    if (payload === 'use_whatsapp') {
      return '1';
    }
    return payload;
  }
  const buttonText = fields.ButtonText?.trim();
  if (buttonText) {
    return buttonText;
  }
  return null;
}

export function parseTwilioWebhook(body: unknown): ParsedTwilioInbound | null {
  const fields = formFields(body);
  if (!fields) {
    return null;
  }

  if (fields.MessageStatus) {
    return null;
  }
  if (fields.SmsStatus && fields.SmsStatus !== 'received') {
    return null;
  }

  const from = fields.From ?? '';
  const waId = fields.WaId || toDigits(from);
  const isWhatsapp = from.startsWith('whatsapp:') || Boolean(fields.WaId);
  if (!waId || !isWhatsapp) {
    return null;
  }

  const inboundChoice = readTwilioInboundChoice(fields);
  const bodyText =
    inboundChoice ?? (fields.Body?.trim() ? fields.Body.trim() : null);

  return {
    waId,
    phoneNumber: waId,
    text: bodyText,
    messageSid: fields.MessageSid ?? fields.SmsSid ?? null,
    raw: fields,
  };
}
