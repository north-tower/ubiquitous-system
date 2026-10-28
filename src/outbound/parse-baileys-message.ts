import {
  isWhatsappLidJid,
  lidProspectKeyFromJid,
  phoneDigitsFromJid,
} from './baileys-lid';

export type BaileysInboundMessage = {
  key?: {
    fromMe?: boolean | null;
    remoteJid?: string | null;
    remoteJidAlt?: string | null;
    participant?: string | null;
    participantAlt?: string | null;
  } | null;
  message?: {
    conversation?: string | null;
    extendedTextMessage?: { text?: string | null } | null;
    listResponseMessage?: {
      singleSelectReply?: {
        selectedRowId?: string | null;
        title?: string | null;
      } | null;
    } | null;
    interactiveResponseMessage?: {
      nativeFlowResponseMessage?: {
        paramsJson?: string | null;
      } | null;
    } | null;
    pollUpdateMessage?: {
      pollCreationMessageKey?: {
        id?: string | null;
        fromMe?: boolean | null;
        remoteJid?: string | null;
        remoteJidAlt?: string | null;
        participant?: string | null;
        participantAlt?: string | null;
      } | null;
      vote?: {
        encPayload?: Uint8Array | Buffer | null;
        encIv?: Uint8Array | Buffer | null;
      } | null;
    } | null;
  } | null;
};

export type ParsedBaileysText = {
  phoneNumber: string;
  text: string;
  jid: string;
};

export function parseBaileysTextMessage(
  message: BaileysInboundMessage,
): ParsedBaileysText | null {
  if (!message.message || message.key?.fromMe) {
    return null;
  }

  const remoteJid = message.key?.remoteJid?.trim() ?? '';
  if (
    !remoteJid ||
    remoteJid.endsWith('@g.us') ||
    remoteJid === 'status@broadcast'
  ) {
    return null;
  }

  const text = readInboundText(message.message).trim();
  if (!text) {
    return null;
  }

  const phoneJid = phoneJidFrom(
    remoteJid,
    message.key?.remoteJidAlt,
    message.key?.participant,
    message.key?.participantAlt,
  );
  const phoneNumber = phoneJid ? phoneDigitsFromJid(phoneJid) : '';
  if (phoneNumber) {
    return { phoneNumber, text, jid: remoteJid };
  }

  if (isWhatsappLidJid(remoteJid)) {
    return {
      phoneNumber: lidProspectKeyFromJid(remoteJid),
      text,
      jid: remoteJid,
    };
  }

  return null;
}

function readInboundText(message: NonNullable<BaileysInboundMessage['message']>): string {
  const listRowId =
    message.listResponseMessage?.singleSelectReply?.selectedRowId?.trim() ??
    '';
  if (listRowId) {
    return listRowId;
  }
  const listTitle =
    message.listResponseMessage?.singleSelectReply?.title?.trim() ?? '';
  if (listTitle) {
    return listTitle;
  }
  const nativeFlow = readNativeFlowSelection(
    message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson,
  );
  if (nativeFlow) {
    return nativeFlow;
  }
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    ''
  );
}

function readNativeFlowSelection(paramsJson: string | null | undefined): string {
  const raw = paramsJson?.trim();
  if (!raw) {
    return '';
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of [
      'id',
      'selected_id',
      'selectedId',
      'selected_row_id',
      'selectedRowId',
    ]) {
      const value = parsed[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  } catch {
    return '';
  }
  return '';
}

function phoneJidFrom(
  remoteJid: string,
  remoteJidAlt: string | null | undefined,
  participant: string | null | undefined,
  participantAlt: string | null | undefined,
): string | null {
  for (const candidate of [
    remoteJid,
    remoteJidAlt,
    participant,
    participantAlt,
  ]) {
    const jid = candidate?.trim() ?? '';
    if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@hosted')) {
      return jid;
    }
  }
  return null;
}
