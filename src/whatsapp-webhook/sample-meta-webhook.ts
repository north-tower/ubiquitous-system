export const SAMPLE_META_TEXT_WEBHOOK = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA_ID_1',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '254700000000',
              phone_number_id: 'PHONE_ID_1',
            },
            contacts: [
              { profile: { name: 'Jane Doe' }, wa_id: '254711111111' },
            ],
            messages: [
              {
                from: '254711111111',
                id: 'wamid.TEST123',
                timestamp: '1700000000',
                type: 'text',
                text: { body: 'hello' },
              },
            ],
          },
        },
      ],
    },
  ],
};
