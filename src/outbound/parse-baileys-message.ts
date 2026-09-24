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

  const text = (
    message.message.conversation ??
    message.message.extendedTextMessage?.text ??
    ''
  ).trim();
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
