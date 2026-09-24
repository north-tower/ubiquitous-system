import { join } from 'path';
import {
  authDirForTenant,
  credsAreLinked,
  isTenantAuthFolderName,
  linkedPhoneFromUser,
  visibleQrDataUrl,
} from './baileys-session';

describe('baileys session helpers', () => {
  it('keeps the existing login folder for the default tenant', () => {
    expect(
      authDirForTenant('default-id', 'default-id', '../baileys-test/auth_info'),
    ).toBe('../baileys-test/auth_info');
    expect(authDirForTenant('default-id', 'default-id', '  ')).toBe(
      'baileys-auth',
    );
    expect(authDirForTenant('default-id', 'default-id', undefined)).toBe(
      'baileys-auth',
    );
  });

  it('gives every other tenant its own auth folder', () => {
    expect(
      authDirForTenant(
        '11111111-1111-1111-1111-111111111111',
        'default-id',
        '../baileys-test/auth_info',
      ),
    ).toBe(join('baileys-auth', '11111111-1111-1111-1111-111111111111'));
  });

  it('recognises tenant auth folders and ignores Baileys cred files', () => {
    expect(
      isTenantAuthFolderName('11111111-1111-4111-8111-111111111111'),
    ).toBe(true);
    expect(isTenantAuthFolderName('creds.json')).toBe(false);
  });

  it('reads the linked phone from a phone jid, including a device suffix', () => {
    expect(
      linkedPhoneFromUser({ id: '254712345678:14@s.whatsapp.net' }),
    ).toBe('254712345678');
  });

  it('prefers phoneNumber when the user id is a LID', () => {
    expect(
      linkedPhoneFromUser({
        id: '123456789012345@lid',
        phoneNumber: '254798229340@s.whatsapp.net',
      }),
    ).toBe('254798229340');
  });

  it('does not store a LID as a phone number', () => {
    expect(linkedPhoneFromUser({ id: '123456789012345@lid' })).toBeNull();
    expect(linkedPhoneFromUser(undefined)).toBeNull();
  });

  it('treats a creds file as linked only when WhatsApp has a user id', () => {
    expect(credsAreLinked({ me: { id: '254712345678:1@s.whatsapp.net' } })).toBe(
      true,
    );
    expect(credsAreLinked({ registered: false })).toBe(false);
    expect(credsAreLinked({ me: {} })).toBe(false);
    expect(credsAreLinked(null)).toBe(false);
  });

  it('exposes the QR data URL only while waiting for a scan', () => {
    expect(visibleQrDataUrl('waiting_for_scan', 'data:image/png;base64,abc')).toBe(
      'data:image/png;base64,abc',
    );
    expect(visibleQrDataUrl('connected', 'data:image/png;base64,abc')).toBeNull();
    expect(visibleQrDataUrl('logged_out', 'data:image/png;base64,abc')).toBeNull();
    expect(visibleQrDataUrl('waiting_for_scan', null)).toBeNull();
  });
});
