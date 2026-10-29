import { hmgTopicButtonMessage } from '../hmg-flow/hmg-interactive';
import { buildTelnyxWhatsappInteractiveButtonBody } from './telnyx-interactive-button';

describe('buildTelnyxWhatsappInteractiveButtonBody', () => {
  it('maps HMG topic buttons to Telnyx interactive button payload', () => {
    const buttons = hmgTopicButtonMessage();
    expect(
      buildTelnyxWhatsappInteractiveButtonBody({
        from: '+254786487316',
        to: '+254799229340',
        buttons,
        messagingProfileId: 'profile-uuid',
      }),
    ).toMatchObject({
      from: '+254786487316',
      to: '+254799229340',
      type: 'WHATSAPP',
      messaging_profile_id: 'profile-uuid',
      whatsapp_message: {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: expect.stringMatching(/\*HMG Group Africa\*/),
          },
          footer: {
            text: expect.stringContaining('4, 5, or 6'),
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: { id: 'tax_kra', title: '📋 Tax & KRA' },
              },
              {
                type: 'reply',
                reply: { id: 'accounting', title: '📒 Accounting' },
              },
              { type: 'reply', reply: { id: 'audit', title: '🔍 Audit' } },
            ],
          },
        },
      },
    });
  });
});
