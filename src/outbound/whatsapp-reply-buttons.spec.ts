import {
  buildTelnyxWhatsappInteractiveButtonBody,
  whatsappInteractiveButtonMessage,
} from './whatsapp-reply-buttons';
import { hmgMenuButtons } from '../hmg-flow/hmg-interactive';

describe('whatsapp reply buttons', () => {
  it('maps the HMG menu to three Telnyx reply buttons', () => {
    const buttons = hmgMenuButtons();
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
          body: { text: expect.stringContaining('HMG Group Africa') },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'tax', title: 'Tax' } },
              {
                type: 'reply',
                reply: { id: 'books', title: 'Books & people' },
              },
              {
                type: 'reply',
                reply: { id: 'audit_other', title: 'Audit & other' },
              },
            ],
          },
        },
      },
    });
  });

  it('drops a fourth button', () => {
    const message = whatsappInteractiveButtonMessage({
      text: 'Pick one',
      buttons: [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' },
        { id: 'd', title: 'D' },
      ],
    }) as {
      interactive: { action: { buttons: unknown[] } };
    };
    expect(message.interactive.action.buttons).toHaveLength(3);
  });
});
