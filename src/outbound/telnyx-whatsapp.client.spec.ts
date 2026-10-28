import { buildTelnyxWhatsappSendBody } from './telnyx-whatsapp.client';

describe('buildTelnyxWhatsappSendBody', () => {
  it('includes WHATSAPP type and optional messaging profile', () => {
    expect(
      buildTelnyxWhatsappSendBody({
        from: '+254786487316',
        to: '+254799229340',
        body: 'Hello',
        messagingProfileId: '4001781e-626f-4a41-a914-b1b682150f94',
      }),
    ).toEqual({
      from: '+254786487316',
      to: '+254799229340',
      type: 'WHATSAPP',
      messaging_profile_id: '4001781e-626f-4a41-a914-b1b682150f94',
      whatsapp_message: {
        type: 'text',
        text: { body: 'Hello', preview_url: false },
      },
    });
  });
});
