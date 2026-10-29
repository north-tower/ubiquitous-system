import { hmgTopicListMessage } from '../hmg-flow/hmg-interactive';
import { buildTelnyxWhatsappInteractiveListBody } from './telnyx-interactive-list';

describe('buildTelnyxWhatsappInteractiveListBody', () => {
  it('maps HMG topic list to Telnyx interactive list payload', () => {
    const list = hmgTopicListMessage();
    expect(
      buildTelnyxWhatsappInteractiveListBody({
        from: '+254786487316',
        to: '+254799229340',
        list,
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
          header: { type: 'text', text: 'HMG Group Africa' },
          body: {
            text: expect.stringContaining('HMG Group Africa'),
          },
          action: {
            button: 'Choose a service',
            sections: [
              {
                title: 'Services',
                rows: expect.arrayContaining([
                  expect.objectContaining({ id: 'tax_kra' }),
                  expect.objectContaining({ id: 'something_else' }),
                ]),
              },
            ],
          },
        },
      },
    });
  });
});
