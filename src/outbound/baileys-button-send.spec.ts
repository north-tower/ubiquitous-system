import { buildBaileysNativeFlowButtonMessage } from './baileys-button-send';

describe('buildBaileysNativeFlowButtonMessage', () => {
  it('sends one quick-reply button per choice', () => {
    const proto = buildBaileysNativeFlowButtonMessage(
      {
        text: 'Which one?',
        buttons: [
          { id: 'tax_kra', title: 'Tax & KRA advisory' },
          { id: 'tax_health', title: 'Tax health check' },
        ],
      },
      new Uint8Array([1, 2, 3]),
    );
    expect(proto.messageContextInfo.messageSecret).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    const buttons = proto.interactiveMessage.nativeFlowMessage.buttons;
    expect(buttons).toHaveLength(2);
    expect(buttons[0].name).toBe('quick_reply');
    expect(JSON.parse(buttons[0].buttonParamsJson)).toEqual({
      display_text: 'Tax & KRA advisory',
      id: 'tax_kra',
    });
  });
});
