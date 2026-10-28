import {
  parseTelnyxWebhook,
  shouldSilentlyIgnoreTelnyxWebhook,
} from './parse-telnyx';

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

describe('parseTelnyxWebhook', () => {
  it('normalizes a WhatsApp text message', () => {
    expect(parseTelnyxWebhook(SAMPLE_TELNYX_TEXT_WEBHOOK)).toEqual({
      waId: '254711111111',
      phoneNumber: '254711111111',
      text: 'hello',
      messageId: 'msg-1',
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
});
