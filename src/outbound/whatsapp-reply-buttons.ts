/** WhatsApp reply-button title limit (Cloud API and Telnyx). */
export const WHATSAPP_REPLY_BUTTON_TITLE_MAX = 20;

/** WhatsApp allows at most three reply buttons on one message. */
export const WHATSAPP_REPLY_BUTTON_MAX = 3;

export type WhatsappReplyButton = {
  id: string;
  title: string;
};

export type WhatsappReplyButtons = {
  /** Body shown above the buttons. Does not repeat the button labels. */
  text: string;
  buttons: WhatsappReplyButton[];
  /** Numbered plain text used only when the buttons cannot be sent. */
  fallbackText?: string;
};

function clamp(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return trimmed.slice(0, max).trimEnd();
}

export function clampReplyButtons(
  spec: WhatsappReplyButtons,
): WhatsappReplyButtons {
  return {
    text: spec.text.trim() || 'Choose an option:',
    buttons: spec.buttons.slice(0, WHATSAPP_REPLY_BUTTON_MAX).map((button) => ({
      id: button.id.trim(),
      title: clamp(button.title, WHATSAPP_REPLY_BUTTON_TITLE_MAX),
    })),
  };
}

export function buildTelnyxWhatsappInteractiveButtonBody(input: {
  from: string;
  to: string;
  buttons: WhatsappReplyButtons;
  messagingProfileId?: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    from: input.from,
    to: input.to,
    type: 'WHATSAPP',
    whatsapp_message: whatsappInteractiveButtonMessage(input.buttons),
  };
  if (input.messagingProfileId) {
    payload.messaging_profile_id = input.messagingProfileId;
  }
  return payload;
}

/** Cloud API interactive button payload, shared by Meta and Telnyx. */
export function whatsappInteractiveButtonMessage(
  spec: WhatsappReplyButtons,
): Record<string, unknown> {
  const buttons = clampReplyButtons(spec);
  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: buttons.text },
      action: {
        buttons: buttons.buttons.map((button) => ({
          type: 'reply',
          reply: {
            id: button.id,
            title: button.title,
          },
        })),
      },
    },
  };
}
