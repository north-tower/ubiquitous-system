import type { ConfigService } from '@nestjs/config';
import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';
import type { BaileysInboundMessage } from './parse-baileys-message';

export function isBaileysDebug(config: ConfigService): boolean {
  const raw = config.get<string>('BAILEYS_DEBUG')?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** Send list body as a normal text message first (greeting still visible if list UI fails). */
export function baileysSendCompanionTextBeforeList(
  config: ConfigService,
): boolean {
  const raw = config
    .get<string>('BAILEYS_ENQUIRY_SEND_BODY_TEXT')
    ?.trim()
    .toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no') {
    return false;
  }
  return true;
}

export function previewBaileysText(text: string, maxLen = 160): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxLen) {
    return oneLine;
  }
  return `${oneLine.slice(0, maxLen - 1)}…`;
}

export function summarizeBaileysList(
  list: BaileysListMessageSpec,
): {
  titleLen: number;
  bodyLen: number;
  buttonText: string;
  rowCount: number;
  rowIds: string[];
} {
  const rowCount = list.sections.reduce(
    (sum, section) => sum + section.rows.length,
    0,
  );
  return {
    titleLen: list.title.length,
    bodyLen: list.text.length,
    buttonText: list.buttonText,
    rowCount,
    rowIds: list.sections.flatMap((section) =>
      section.rows.map((row) => row.rowId),
    ),
  };
}

/** Top-level proto keys on an inbound Baileys message (for debug when parse returns null). */
export function baileysInboundPayloadKeys(
  message: BaileysInboundMessage,
): string {
  if (!message.message) {
    return '(no message payload)';
  }
  const keys = Object.keys(message.message).filter(
    (key) => key !== 'messageContextInfo' && key !== 'senderKeyDistributionMessage',
  );
  return keys.length > 0 ? keys.join(',') : '(empty message object)';
}
