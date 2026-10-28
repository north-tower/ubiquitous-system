import { parseInboundWebhook } from './parse-inbound';

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

/** E.164 digits or a WhatsApp BSUID (e.g. US.1349…). */
function readInboundSender(payload: Record<string, unknown>): string | null {
  const fromObject = readPhoneNumber(payload.from);
  if (fromObject) {
    return fromObject;
  }
  if (typeof payload.from === 'string') {
    const trimmed = payload.from.trim();
    if (trimmed) {
      if (/^[A-Z]{2}\./.test(trimmed)) {
        return trimmed;
      }
      const digits = toDigits(trimmed);
      if (digits) {
        return digits;
      }
    }
  }

  const body = payload.body;
  if (isRecord(body)) {
    if (typeof body.from === 'string') {
      const trimmed = body.from.trim();
      if (trimmed) {
        if (/^[A-Z]{2}\./.test(trimmed)) {
          return trimmed;
        }
        const digits = toDigits(trimmed);
        if (digits) {
          return digits;
        }
      }
    }
    if (typeof body.from_user_id === 'string') {
      const trimmed = body.from_user_id.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}

function isWhatsappPayload(payload: Record<string, unknown>): boolean {
  const messageType =
    typeof payload.type === 'string' ? payload.type.toUpperCase() : '';
  if (messageType === 'WHATSAPP') {
    return true;
  }
  const body = payload.body;
  if (!isRecord(body)) {
    return false;
  }
  if (
    typeof body.foreign_id === 'string' &&
    body.foreign_id.startsWith('wamid.')
  ) {
    return true;
  }
  const bodyType = typeof body.type === 'string' ? body.type.toLowerCase() : '';
  return (
    bodyType === 'text' ||
    bodyType === 'interactive' ||
    bodyType === 'image' ||
    bodyType === 'audio' ||
    bodyType === 'video' ||
    bodyType === 'document' ||
    bodyType === 'button' ||
    bodyType === 'reaction' ||
    bodyType === 'edit' ||
    bodyType === 'revoke'
  );
}

export function shouldSilentlyIgnoreTelnyxWebhook(body: unknown): boolean {
  if (!isRecord(body)) {
    return false;
  }
  const data = body.data;
  if (!isRecord(data) || typeof data.event_type !== 'string') {
    return false;
  }
  const eventType = data.event_type;
  if (
    eventType === 'message.sent' ||
    eventType === 'message.finalized' ||
    eventType === 'whatsapp.account.update'
  ) {
    return true;
  }
  if (eventType === 'whatsapp.messages') {
    const payload = data.payload;
    if (!isRecord(payload)) {
      return true;
    }
    if (parseInboundWebhook(payload).length > 0) {
      return false;
    }
    return parseTelnyxWhatsappPayloadRecord(payload) === null;
  }
  if (eventType !== 'message.received') {
    return true;
  }
  const payload = data.payload;
  if (!isRecord(payload)) {
    return false;
  }
  const messageType =
    typeof payload.type === 'string' ? payload.type.toUpperCase() : '';
  if (messageType === 'SMS' || messageType === 'MMS') {
    return true;
  }
  const direction =
    typeof payload.direction === 'string'
      ? payload.direction.toLowerCase()
      : 'inbound';
  if (direction !== 'inbound') {
    return true;
  }
  return false;
}

function parseTelnyxWhatsappPayloadRecord(
  payload: Record<string, unknown>,
): ParsedTelnyxInbound | null {
  if (!isWhatsappPayload(payload)) {
    return null;
  }

  const direction =
    typeof payload.direction === 'string'
      ? payload.direction.toLowerCase()
      : 'inbound';
  if (direction !== 'inbound') {
    return null;
  }

  const waId = readInboundSender(payload);
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
    raw: payload,
  };
}

function parseTelnyxWabaMessages(body: Record<string, unknown>): ParsedTelnyxInbound | null {
  const data = body.data;
  if (!isRecord(data) || data.event_type !== 'whatsapp.messages') {
    return null;
  }
  const payload = data.payload;
  if (!isRecord(payload)) {
    return null;
  }
  const [first] = parseInboundWebhook(payload);
  if (!first) {
    return null;
  }
  const raw = first.raw;
  const messageId =
    isRecord(raw) && typeof raw.id === 'string' && raw.id.length > 0
      ? raw.id
      : null;
  return {
    waId: first.waId,
    phoneNumber: first.phoneNumber,
    text: first.text,
    messageId,
    raw: body,
  };
}

export function readTelnyxWebhookEventType(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const data = body.data;
  if (!isRecord(data) || typeof data.event_type !== 'string') {
    return null;
  }
  return data.event_type;
}

export function summarizeTelnyxWebhook(body: unknown): string {
  if (!isRecord(body)) {
    return 'body is not an object';
  }
  const data = body.data;
  if (!isRecord(data)) {
    return 'missing data';
  }
  const eventType =
    typeof data.event_type === 'string' ? data.event_type : 'unknown';
  const payload = data.payload;
  if (!isRecord(payload)) {
    return `event_type=${eventType} missing payload`;
  }
  const messageType =
    typeof payload.type === 'string' ? payload.type : 'unknown';
  const direction =
    typeof payload.direction === 'string' ? payload.direction : 'unknown';
  return `event_type=${eventType} payload.type=${messageType} direction=${direction}`;
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

function parseTelnyxNativeWhatsappEvent(
  body: Record<string, unknown>,
): ParsedTelnyxInbound | null {
  const data = body.data;
  if (!isRecord(data)) {
    return null;
  }
  const eventType = data.event_type;
  if (eventType !== 'message.received' && eventType !== 'whatsapp.messages') {
    return null;
  }
  const payload = data.payload;
  if (!isRecord(payload)) {
    return null;
  }
  const parsed = parseTelnyxWhatsappPayloadRecord(payload);
  if (!parsed) {
    return null;
  }
  return { ...parsed, raw: body };
}

export function parseTelnyxWebhook(body: unknown): ParsedTelnyxInbound | null {
  if (!isRecord(body)) {
    return null;
  }
  const waba = parseTelnyxWabaMessages(body);
  if (waba) {
    return waba;
  }
  return parseTelnyxNativeWhatsappEvent(body);
}
