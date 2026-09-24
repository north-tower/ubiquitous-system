import { parseBaileysTextMessage } from './parse-baileys-message';

describe('parseBaileysTextMessage', () => {
  it('reads a direct chat and keeps the reply jid', () => {
    expect(
      parseBaileysTextMessage({
        key: { remoteJid: '254711111111@s.whatsapp.net', fromMe: false },
        message: { conversation: 'hello' },
      }),
    ).toEqual({
      phoneNumber: '254711111111',
      text: 'hello',
      jid: '254711111111@s.whatsapp.net',
    });
  });

  it('uses the phone alt jid when the chat id is a lid', () => {
    expect(
      parseBaileysTextMessage({
        key: {
          remoteJid: '999000111@lid',
          remoteJidAlt: '254700000001@s.whatsapp.net',
        },
        message: { extendedTextMessage: { text: '  budget  ' } },
      }),
    ).toEqual({
      phoneNumber: '254700000001',
      text: 'budget',
      jid: '999000111@lid',
    });
  });

  it('ignores messages sent by this session', () => {
    expect(
      parseBaileysTextMessage({
        key: { remoteJid: '254711111111@s.whatsapp.net', fromMe: true },
        message: { conversation: 'hello' },
      }),
    ).toBeNull();
  });

  it('ignores groups, status, and empty text', () => {
    expect(
      parseBaileysTextMessage({
        key: { remoteJid: '120363000@g.us' },
        message: { conversation: 'hello' },
      }),
    ).toBeNull();
    expect(
      parseBaileysTextMessage({
        key: { remoteJid: 'status@broadcast' },
        message: { conversation: 'hello' },
      }),
    ).toBeNull();
    expect(
      parseBaileysTextMessage({
        key: { remoteJid: '254711111111@s.whatsapp.net' },
        message: { conversation: '   ' },
      }),
    ).toBeNull();
    expect(
      parseBaileysTextMessage({
        key: { remoteJid: '254711111111@s.whatsapp.net' },
        message: null,
      }),
    ).toBeNull();
  });

  it('ignores a lid chat that has no phone number', () => {
    expect(
      parseBaileysTextMessage({
        key: { remoteJid: '999000111@lid' },
        message: { conversation: 'hello' },
      }),
    ).toBeNull();
  });
});
