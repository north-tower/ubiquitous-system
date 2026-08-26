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

  const bodyText = fields.Body?.trim() ? fields.Body : null;

  return {
    waId,
    phoneNumber: waId,
    text: bodyText,
    messageSid: fields.MessageSid ?? fields.SmsSid ?? null,
    raw: fields,
  };
}
