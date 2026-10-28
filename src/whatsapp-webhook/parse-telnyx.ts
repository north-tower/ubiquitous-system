export type ParsedTelnyxInbound = {
  waId: string;
  phoneNumber: string;
  text: string | null;
  messageId: string | null;
  raw: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDigits(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

function readPhoneNumber(value: unknown): string | null {
  if (!isRecord(value) || typeof value.phone_number !== 'string') {
    return null;
  }
  const digits = toDigits(value.phone_number);
  return digits || null;
}

function readWhatsAppBodyText(body: Record<string, unknown>): string | null {
  const interactive = body.interactive;
  if (isRecord(interactive)) {
    const button = interactive.button_reply;
    if (isRecord(button)) {
      if (typeof button.id === 'string' && button.id.trim()) {
        return button.id.trim();
      }
      if (typeof button.title === 'string' && button.title.trim()) {
        return button.title.trim();
      }
    }
    const list = interactive.list_reply;
    if (isRecord(list)) {
      if (typeof list.id === 'string' && list.id.trim()) {
        return list.id.trim();
      }
      if (typeof list.title === 'string' && list.title.trim()) {
        return list.title.trim();
      }
    }
    const nfm = interactive.nfm_reply;
    if (isRecord(nfm) && typeof nfm.response_json === 'string') {
      const trimmed = nfm.response_json.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  const text = body.text;
  if (isRecord(text) && typeof text.body === 'string') {
    const trimmed = text.body.trim();
    return trimmed || null;
  }

  return null;
}

function readInboundText(payload: Record<string, unknown>): string | null {
  const body = payload.body;
  if (isRecord(body)) {
    const fromBody = readWhatsAppBodyText(body);
    if (fromBody) {
      return fromBody;
    }
  }
  if (typeof payload.text === 'string') {
    const trimmed = payload.text.trim();
    return trimmed || null;
  }
  return null;
}

export function parseTelnyxWebhook(body: unknown): ParsedTelnyxInbound | null {
  if (!isRecord(body)) {
    return null;
  }
  const data = body.data;
  if (!isRecord(data) || data.event_type !== 'message.received') {
    return null;
  }
  const payload = data.payload;
  if (!isRecord(payload)) {
    return null;
  }

  const messageType =
    typeof payload.type === 'string' ? payload.type.toUpperCase() : '';
  if (messageType !== 'WHATSAPP') {
    return null;
  }

  const direction =
    typeof payload.direction === 'string'
      ? payload.direction.toLowerCase()
      : 'inbound';
  if (direction !== 'inbound') {
    return null;
  }

  const waId = readPhoneNumber(payload.from);
  if (!waId) {
    return null;
  }

  const messageId =
    typeof payload.id === 'string' && payload.id.length > 0 ? payload.id : null;

  return {
    waId,
    phoneNumber: waId,
    text: readInboundText(payload),
    messageId,
    raw: body,
  };
}
