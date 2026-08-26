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
