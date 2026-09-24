export type BaileysInboundMessage = {
  key?: {
    fromMe?: boolean | null;
    remoteJid?: string | null;
    remoteJidAlt?: string | null;
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

  const phoneJid = phoneJidFrom(remoteJid, message.key?.remoteJidAlt ?? '');
  const phoneNumber = phoneJid ? jidUser(phoneJid).replace(/[^\d]/g, '') : '';
  if (!phoneNumber) {
    return null;
  }

  return { phoneNumber, text, jid: remoteJid };
}

function phoneJidFrom(
  remoteJid: string,
  remoteJidAlt: string | null | undefined,
): string | null {
  if (remoteJid.endsWith('@s.whatsapp.net')) {
    return remoteJid;
  }
  const alt = remoteJidAlt?.trim() ?? '';
  if (alt.endsWith('@s.whatsapp.net')) {
    return alt;
  }
  return null;
}

function jidUser(jid: string): string {
  return jid.split('@')[0]?.split(':')[0] ?? '';
}
