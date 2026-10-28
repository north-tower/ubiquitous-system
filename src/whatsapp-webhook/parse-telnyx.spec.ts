import {
  parseTelnyxWebhook,
  shouldSilentlyIgnoreTelnyxWebhook,
} from './parse-telnyx';
import { SAMPLE_META_TEXT_WEBHOOK } from './sample-meta-webhook';

export const SAMPLE_TELNYX_TEXT_WEBHOOK = {
  data: {
    record_type: 'event',
    id: 'evt-1',
    event_type: 'message.received',
    occurred_at: '2026-01-01T12:00:00.000+00:00',
    payload: {
      record_type: 'message',
      direction: 'inbound',
      id: 'msg-1',
      type: 'WHATSAPP',
      from: {
        phone_number: '+254711111111',
      },
      to: [{ phone_number: '+15551234567', status: 'webhook_delivered' }],
      body: {
        type: 'text',
        text: { body: 'hello' },
      },
    },
  },
  meta: { attempt: 1, delivered_to: 'https://example.com/webhooks/telnyx' },
};

/** Telnyx `whatsapp.messages` with Cloud API fields directly on `payload`. */
export const SAMPLE_TELNYX_FLAT_WABA_WEBHOOK = {
  data: {
    event_type: 'whatsapp.messages',
    id: 'evt-flat',
    occurred_at: '2026-10-28T20:00:30Z',
    record_type: 'event',
    payload: {
      contacts: [{ profile: { name: 'Jane' }, wa_id: '254799229340' }],
      messages: [
        {
          foreign_id: 'wamid.TEST_FLAT',
          from: '+254799229340',
          from_user_id: 'KE.1507418017736100',
          id: '58810d4d-8623-4b05-8818-5e26433659ac',
          text: { body: 'Hi' },
          timestamp: '1793217626',
          type: 'text',
        },
      ],
      messaging_product: 'whatsapp',
      metadata: {
        display_phone_number: '254786487316',
        phone_number_id: '1358319770704653',
      },
    },
  },
  meta: { attempt: 1, delivered_to: 'https://example.com/webhooks/telnyx' },
};

describe('parseTelnyxWebhook', () => {
  it('normalizes a WhatsApp text message', () => {
    expect(parseTelnyxWebhook(SAMPLE_TELNYX_TEXT_WEBHOOK)).toEqual({
      waId: '254711111111',
      phoneNumber: '254711111111',
      text: 'hello',
      messageId: 'msg-1',
      businessPhoneNumber: '+15551234567',
      raw: SAMPLE_TELNYX_TEXT_WEBHOOK,
    });
  });

  it('reads sender from payload.body.from when payload.from is absent', () => {
    expect(
      parseTelnyxWebhook({
        data: {
          event_type: 'message.received',
          payload: {
            direction: 'inbound',
            type: 'WHATSAPP',
            body: {
              from: '+254711222333',
              type: 'text',
              text: { body: 'Hi from Telnyx shape' },
            },
          },
        },
      }),
    ).toMatchObject({
      waId: '254711222333',
      phoneNumber: '254711222333',
      text: 'Hi from Telnyx shape',
    });
  });

  it('reads button_reply id as the inbound choice', () => {
    expect(
      parseTelnyxWebhook({
        ...SAMPLE_TELNYX_TEXT_WEBHOOK,
        data: {
          ...SAMPLE_TELNYX_TEXT_WEBHOOK.data,
          payload: {
            ...SAMPLE_TELNYX_TEXT_WEBHOOK.data.payload,
            body: {
              type: 'interactive',
              interactive: {
                type: 'button_reply',
                button_reply: { id: 'confirm', title: 'Yes' },
              },
            },
          },
        },
      }),
    ).toMatchObject({
      text: 'confirm',
    });
  });

  it('ignores SMS message.received events', () => {
    expect(
      parseTelnyxWebhook({
        data: {
          event_type: 'message.received',
          payload: {
            direction: 'inbound',
            type: 'SMS',
            from: { phone_number: '+254711111111' },
            text: 'sms only',
          },
        },
      }),
    ).toBeNull();
  });

  it('ignores outbound WhatsApp status webhooks', () => {
    expect(
      parseTelnyxWebhook({
        data: {
          event_type: 'message.sent',
          payload: {
            direction: 'outbound',
            type: 'WHATSAPP',
            from: { phone_number: '+15551234567' },
          },
        },
      }),
    ).toBeNull();
  });
});

describe('shouldSilentlyIgnoreTelnyxWebhook', () => {
  it('ignores delivery status events on the same URL', () => {
    expect(
      shouldSilentlyIgnoreTelnyxWebhook({
        data: {
          event_type: 'message.sent',
          payload: { direction: 'outbound', type: 'WHATSAPP' },
        },
      }),
    ).toBe(true);
    expect(
      shouldSilentlyIgnoreTelnyxWebhook({
        data: {
          event_type: 'message.finalized',
          payload: { direction: 'outbound', type: 'WHATSAPP' },
        },
      }),
    ).toBe(true);
  });

  it('does not ignore inbound WhatsApp message.received', () => {
    expect(
      shouldSilentlyIgnoreTelnyxWebhook(SAMPLE_TELNYX_TEXT_WEBHOOK),
    ).toBe(false);
  });

  it('does not ignore WABA whatsapp.messages with an inbound text', () => {
    expect(
      shouldSilentlyIgnoreTelnyxWebhook({
        data: {
          event_type: 'whatsapp.messages',
          payload: SAMPLE_META_TEXT_WEBHOOK,
        },
      }),
    ).toBe(false);
  });

  it('ignores WABA whatsapp.messages that only carry delivery statuses', () => {
    expect(
      shouldSilentlyIgnoreTelnyxWebhook({
        data: {
          event_type: 'whatsapp.messages',
          payload: {
            object: 'whatsapp_business_account',
            entry: [
              {
                changes: [
                  {
                    value: {
                      metadata: { phone_number_id: 'PHONE_ID_1' },
                      statuses: [{ id: 'wamid.X', status: 'delivered' }],
                    },
                  },
                ],
              },
            ],
          },
        },
      }),
    ).toBe(true);
  });
});

describe('parseTelnyxWebhook WABA', () => {
  it('normalizes whatsapp.messages using the Telnyx message.received payload shape', () => {
    expect(
      parseTelnyxWebhook({
        data: {
          event_type: 'whatsapp.messages',
          payload: SAMPLE_TELNYX_TEXT_WEBHOOK.data.payload,
        },
      }),
    ).toMatchObject({
      waId: '254711111111',
      phoneNumber: '254711111111',
      text: 'hello',
      messageId: 'msg-1',
    });
  });

  it('does not silently ignore whatsapp.messages with Telnyx-native inbound payload', () => {
    expect(
      shouldSilentlyIgnoreTelnyxWebhook({
        data: {
          event_type: 'whatsapp.messages',
          payload: SAMPLE_TELNYX_TEXT_WEBHOOK.data.payload,
        },
      }),
    ).toBe(false);
  });

  it('normalizes whatsapp.messages using the Meta Cloud API shape', () => {
    expect(
      parseTelnyxWebhook({
        data: {
          event_type: 'whatsapp.messages',
          payload: SAMPLE_META_TEXT_WEBHOOK,
        },
      }),
    ).toMatchObject({
      waId: '254711111111',
      phoneNumber: '254711111111',
      text: 'hello',
      messageId: 'wamid.TEST123',
    });
  });

  it('normalizes whatsapp.messages with flattened Telnyx WABA payload', () => {
    expect(parseTelnyxWebhook(SAMPLE_TELNYX_FLAT_WABA_WEBHOOK)).toMatchObject({
      waId: '254799229340',
      phoneNumber: '254799229340',
      text: 'Hi',
      messageId: 'wamid.TEST_FLAT',
      businessPhoneNumber: '+254786487316',
      raw: SAMPLE_TELNYX_FLAT_WABA_WEBHOOK,
    });
    expect(
      shouldSilentlyIgnoreTelnyxWebhook(SAMPLE_TELNYX_FLAT_WABA_WEBHOOK),
    ).toBe(false);
  });
});
