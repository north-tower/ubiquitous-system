import {
  jidAddressingKind,
  normalizeWhatsAppUserJid,
  pickOutboundRecipientJid,
} from './baileys-outbound-jid';

describe('pickOutboundRecipientJid', () => {
  it('prefers a phone jid from onWhatsApp over a remembered lid', () => {
    expect(
      pickOutboundRecipientJid('159953272705116@lid', [
        { exists: true, jid: '254799229340@s.whatsapp.net' },
      ]),
    ).toBe('254799229340@s.whatsapp.net');
  });

  it('keeps a remembered phone jid without lookup', () => {
    expect(
      pickOutboundRecipientJid('254799229340@s.whatsapp.net', undefined),
    ).toBe('254799229340@s.whatsapp.net');
  });

  it('falls back to remembered lid when lookup finds nothing', () => {
    expect(
      pickOutboundRecipientJid('159953272705116@lid', [
        { exists: false, jid: '254799229340@s.whatsapp.net' },
      ]),
    ).toBe('159953272705116@lid');
  });
});

describe('normalizeWhatsAppUserJid', () => {
  it('removes the device suffix from phone jids', () => {
    expect(normalizeWhatsAppUserJid('254799229340:0@s.whatsapp.net')).toBe(
      '254799229340@s.whatsapp.net',
    );
  });
});

describe('jidAddressingKind', () => {
  it('classifies lid and phone jids', () => {
    expect(jidAddressingKind('159953272705116@lid')).toBe('lid');
    expect(jidAddressingKind('254799229340@s.whatsapp.net')).toBe('phone');
  });
});
