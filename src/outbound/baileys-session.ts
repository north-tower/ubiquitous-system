import { join } from 'path';

/** In-memory Baileys link state for one tenant socket. */
export type BaileysSessionStatus =
  | 'waiting_for_scan'
  | 'connected'
  | 'logged_out';

/** Parent folder for every tenant session except the existing default login. */
export const BAILEYS_SESSIONS_ROOT = 'baileys-auth';

const TENANT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTenantAuthFolderName(name: string): boolean {
  return TENANT_ID_RE.test(name);
}

/**
 * Default tenant keeps the login already stored at BAILEYS_AUTH_DIR.
 * Every other tenant gets baileys-auth/<tenantId>.
 */
export function authDirForTenant(
  tenantId: string,
  defaultTenantId: string | null,
  configuredAuthDir: string | undefined,
): string {
  if (defaultTenantId && tenantId === defaultTenantId) {
    const configured = configuredAuthDir?.trim();
    return configured ? configured : BAILEYS_SESSIONS_ROOT;
  }
  return join(BAILEYS_SESSIONS_ROOT, tenantId);
}

/** A saved login has `me.id`. An unlinked folder does not, even after Baileys writes keys. */
export function credsAreLinked(creds: unknown): boolean {
  if (typeof creds !== 'object' || creds === null || !('me' in creds)) {
    return false;
  }
  const me = (creds as { me?: unknown }).me;
  if (typeof me !== 'object' || me === null || !('id' in me)) {
    return false;
  }
  const id = (me as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0;
}

export function visibleQrDataUrl(
  status: BaileysSessionStatus | null,
  qrDataUrl: string | null,
): string | null {
  if (status !== 'waiting_for_scan') {
    return null;
  }
  return qrDataUrl;
}

type BaileysUser = {
  id?: string;
  phoneNumber?: string;
};

/** Digits of the WhatsApp account that scanned the QR. LID-only ids are ignored. */
export function linkedPhoneFromUser(
  user: BaileysUser | null | undefined,
): string | null {
  const phoneJid = user?.phoneNumber?.trim();
  if (phoneJid) {
    return digitsFromJid(phoneJid);
  }
  const id = user?.id?.trim() ?? '';
  if (id.endsWith('@s.whatsapp.net')) {
    return digitsFromJid(id);
  }
  return null;
}

function digitsFromJid(jid: string): string | null {
  const user = jid.split('@')[0]?.split(':')[0] ?? '';
  const digits = user.replace(/[^\d]/g, '');
  return digits.length > 0 ? digits : null;
}
