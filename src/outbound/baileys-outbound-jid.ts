import { isWhatsappLidJid } from './baileys-lid';

export type OnWhatsAppMatch = { jid: string; exists: boolean };

/**
 * WhatsApp often delivers to the phone JID; replying on a cached @lid can succeed in
 * Baileys logs but not show on the user's device.
 */
export function pickOutboundRecipientJid(
  remembered: string | undefined,
  onWhatsAppMatches: OnWhatsAppMatch[] | undefined,
): string | null {
  if (remembered && !isWhatsappLidJid(remembered)) {
    return remembered;
  }

  const phoneJid = onWhatsAppMatches?.find(
    (match) => match.exists && match.jid && !isWhatsappLidJid(match.jid),
  )?.jid;
  if (phoneJid) {
    return phoneJid;
  }

  const anyExisting = onWhatsAppMatches?.find((match) => match.exists)?.jid;
  if (anyExisting) {
    return anyExisting;
  }

  if (remembered) {
    return remembered;
  }

  return null;
}

/** Strip device suffix (`:0`) so relay addressing matches what WA Web uses. */
export function normalizeWhatsAppUserJid(jid: string): string {
  const at = jid.indexOf('@');
  if (at < 0) {
    return jid;
  }
  const userPart = jid.slice(0, at).split(':')[0]?.split('_')[0] ?? '';
  const server = jid.slice(at + 1);
  if (!userPart) {
    return jid;
  }
  const normalizedServer = server === 'c.us' ? 's.whatsapp.net' : server;
  return `${userPart}@${normalizedServer}`;
}

export function jidAddressingKind(jid: string): 'lid' | 'phone' | 'other' {
  if (isWhatsappLidJid(jid)) {
    return 'lid';
  }
  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@hosted')) {
    return 'phone';
  }
  return 'other';
}
