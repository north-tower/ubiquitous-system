import { parseTwilioWebhook } from './parse-twilio';

export const SAMPLE_TWILIO_TEXT_WEBHOOK = {
  SmsMessageSid: 'SM123',
  SmsSid: 'SM123',
  SmsStatus: 'received',
  Body: 'hello',
  From: 'whatsapp:+254711111111',
  To: 'whatsapp:+14155238886',
  AccountSid: 'AC123',
  NumMedia: '0',
  WaId: '254711111111',
  MessageSid: 'SM123',
  ProfileName: 'Prospect',
};

describe('parseTwilioWebhook', () => {
  it('normalizes a WhatsApp sandbox text message', () => {
    expect(parseTwilioWebhook(SAMPLE_TWILIO_TEXT_WEBHOOK)).toEqual({
      waId: '254711111111',
      phoneNumber: '254711111111',
      text: 'hello',
      messageSid: 'SM123',
      raw: SAMPLE_TWILIO_TEXT_WEBHOOK,
    });
  });

  it('uses quick-reply ButtonPayload when present', () => {
    expect(
      parseTwilioWebhook({
        ...SAMPLE_TWILIO_TEXT_WEBHOOK,
        Body: 'Yes, send it',
        ButtonPayload: 'confirm',
        ButtonText: 'Yes, send it',
      }),
    ).toMatchObject({
      text: 'confirm',
    });
  });

  it('maps use_whatsapp phone quick-reply to reply 1', () => {
    expect(
      parseTwilioWebhook({
        ...SAMPLE_TWILIO_TEXT_WEBHOOK,
        Body: 'Use this number',
        ButtonPayload: 'use_whatsapp',
      }),
    ).toMatchObject({
      text: '1',
    });
  });

  it('maps Flow MULTI_SELECT submissions to comma-separated service ids', () => {
    expect(
      parseTwilioWebhook({
        ...SAMPLE_TWILIO_TEXT_WEBHOOK,
        Body: 'Sent',
        InteractiveData: JSON.stringify({
          flowResponse: {
            flow_token: 'abc',
            screen_0_services_0: ['sound_pa', 'lighting'],
          },
        }),
      }),
    ).toMatchObject({
      text: 'sound_pa, lighting',
    });
  });

  it('uses the list row id when the customer taps a choice', () => {
    expect(
      parseTwilioWebhook({
        ...SAMPLE_TWILIO_TEXT_WEBHOOK,
        Body: 'Church event',
        ListId: 'church',
        ListTitle: 'Church event',
      }),
    ).toMatchObject({
      text: 'church',
      phoneNumber: '254711111111',
    });
  });

  it('ignores delivery status callbacks', () => {
    expect(
      parseTwilioWebhook({
        MessageSid: 'SM123',
        MessageStatus: 'delivered',
        From: 'whatsapp:+254711111111',
        To: 'whatsapp:+14155238886',
        WaId: '254711111111',
      }),
    ).toBeNull();
  });

  it('returns null for a non-WhatsApp SMS payload', () => {
    expect(
      parseTwilioWebhook({
        From: '+254711111111',
        To: '+14155238886',
        Body: 'hello',
        SmsStatus: 'received',
      }),
    ).toBeNull();
  });
});
