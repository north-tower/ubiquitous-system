import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';
import { buildTelnyxWhatsappInteractiveListBody } from './telnyx-interactive-list';

const sampleList: BaileysListMessageSpec = {
  kind: 'list',
  text: 'What are you planning?',
  title: 'Event type',
  buttonText: 'Choose event type',
  sections: [
    {
      title: 'Event type',
      rows: [
        { title: 'Wedding', rowId: 'wedding' },
        { title: 'Corporate', rowId: 'corporate' },
      ],
    },
  ],
};

describe('buildTelnyxWhatsappInteractiveListBody', () => {
  it('maps a list spec to a Telnyx interactive list payload', () => {
    expect(
      buildTelnyxWhatsappInteractiveListBody({
        from: '+254786487316',
        to: '+254799229340',
        list: sampleList,
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
          type: 'list',
          header: { type: 'text', text: 'Event type' },
          body: { text: 'What are you planning?' },
          action: {
            button: 'Choose event type',
            sections: [
              {
                title: 'Event type',
                rows: [
                  { id: 'wedding', title: 'Wedding' },
                  { id: 'corporate', title: 'Corporate' },
                ],
              },
            ],
          },
        },
      },
    });
  });
});
