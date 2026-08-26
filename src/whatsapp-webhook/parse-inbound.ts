export type ParsedInboundMessage = {
  waId: string;
  phoneNumber: string;
  metaPhoneNumberId: string;
  messageType: string;
  text: string | null;
  timestamp: Date;
  raw: unknown;
};

export type NormalizedInboundMessage = {
  waId: string;
  phoneNumber: string;
  tenantId: string;
  messageType: string;
  text: string | null;
  timestamp: Date;
  raw: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseMetaTimestamp(value: unknown): Date {
  const raw = asString(value);
  if (!raw) {
    return new Date();
  }
  const seconds = Number(raw);
  if (!Number.isFinite(seconds)) {
    return new Date();
  }
  return new Date(seconds * 1000);
}

function textFor(message: Record<string, unknown>): string | null {
  if (asString(message.type) !== 'text' || !isRecord(message.text)) {
    return null;
  }
  return asString(message.text.body);
}

export function parseInboundWebhook(payload: unknown): ParsedInboundMessage[] {
  if (!isRecord(payload) || !Array.isArray(payload.entry)) {
    return [];
  }

  const parsed: ParsedInboundMessage[] = [];

  for (const entry of payload.entry) {
    if (!isRecord(entry)) {
      continue;
    }
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      if (!isRecord(change) || !isRecord(change.value)) {
        continue;
      }

      const value = change.value;
      const metadata = isRecord(value.metadata) ? value.metadata : null;
      const metaPhoneNumberId = metadata
        ? asString(metadata.phone_number_id)
        : null;
      if (!metaPhoneNumberId) {
        continue;
      }

      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const message of messages) {
        if (!isRecord(message)) {
          continue;
        }
        const waId = asString(message.from);
        const messageType = asString(message.type);
        if (!waId || !messageType) {
          continue;
        }

        parsed.push({
          waId,
          phoneNumber: waId,
          metaPhoneNumberId,
          messageType,
          text: textFor(message),
          timestamp: parseMetaTimestamp(message.timestamp),
          raw: message,
        });
      }
    }
  }

  return parsed;
}
