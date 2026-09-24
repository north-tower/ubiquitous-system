/** Conversation key when WhatsApp only exposes a LID chat id (no phone jid yet). */
export const LID_PROSPECT_PREFIX = 'lid:';

export function isWhatsappLidJid(jid: string): boolean {
  return jid.endsWith('@lid') || jid.endsWith('@hosted.lid');
}

export function isLidProspectKey(prospectPhone: string): boolean {
  return prospectPhone.startsWith(LID_PROSPECT_PREFIX);
}

export function lidProspectKeyFromJid(jid: string): string {
  const user = jid.split('@')[0]?.split(':')[0] ?? '';
  return `${LID_PROSPECT_PREFIX}${user}`;
}

export function jidUserPart(jid: string): string {
  return jid.split('@')[0]?.split(':')[0] ?? '';
}

export function phoneDigitsFromJid(jid: string): string {
  return jidUserPart(jid).replace(/[^\d]/g, '');
}
