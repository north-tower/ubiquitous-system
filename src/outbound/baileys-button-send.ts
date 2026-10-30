import { randomBytes } from 'node:crypto';
import type { BaileysNativeFlowWaMessage } from './baileys-list-send';
import {
  clampReplyButtons,
  type WhatsappReplyButtons,
} from './whatsapp-reply-buttons';

/** Native-flow quick replies. One tap sends; capped at 3 buttons. */
export function buildBaileysNativeFlowButtonMessage(
  spec: WhatsappReplyButtons,
  messageSecret: Uint8Array = randomBytes(32),
): BaileysNativeFlowWaMessage {
  const buttons = clampReplyButtons(spec);
  return {
    messageContextInfo: { messageSecret },
    interactiveMessage: {
      body: { text: buttons.text },
      nativeFlowMessage: {
        messageVersion: 1,
        buttons: buttons.buttons.map((button) => ({
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: button.title,
            id: button.id,
          }),
        })),
      },
    },
  };
}
