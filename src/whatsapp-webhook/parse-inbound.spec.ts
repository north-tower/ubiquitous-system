import { parseInboundWebhook } from './parse-inbound';
import { SAMPLE_META_TEXT_WEBHOOK } from './sample-meta-webhook';

describe('parseInboundWebhook', () => {
  it('normalizes a Cloud API text message', () => {
    expect(parseInboundWebhook(SAMPLE_META_TEXT_WEBHOOK)).toEqual([
      {
        waId: '254711111111',
        phoneNumber: '254711111111',
        metaPhoneNumberId: 'PHONE_ID_1',
        messageType: 'text',
        text: 'hello',
        timestamp: new Date(1700000000 * 1000),
        raw: SAMPLE_META_TEXT_WEBHOOK.entry[0].changes[0].value.messages[0],
      },
    ]);
  });

  it('returns no messages for a status-only webhook', () => {
    expect(
      parseInboundWebhook({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WABA_ID_1',
            changes: [
              {
                field: 'messages',
                value: {
                  metadata: { phone_number_id: 'PHONE_ID_1' },
                  statuses: [{ id: 'wamid.TEST123', status: 'delivered' }],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });
});
