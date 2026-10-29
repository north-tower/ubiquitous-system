/** WhatsApp Cloud API quick-reply buttons (max 3, title max 20 chars). */
export type TelnyxReplyButtonSpec = {
  bodyText: string;
  headerText?: string;
  footerText?: string;
  buttons: { id: string; title: string }[];
};

const WA_BUTTON_TITLE_MAX = 20;
const WA_HEADER_TEXT_MAX = 60;
const WA_FOOTER_TEXT_MAX = 60;
const WA_BODY_TEXT_MAX = 1024;
const WA_BUTTON_COUNT_MAX = 3;

function clamp(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return trimmed.slice(0, max).trimEnd();
}

export function telnyxInteractiveButtonsFromSpec(
  spec: TelnyxReplyButtonSpec,
): Record<string, unknown> {
  const buttons = spec.buttons.slice(0, WA_BUTTON_COUNT_MAX).map((button) => ({
    type: 'reply',
    reply: {
      id: button.id,
      title: clamp(button.title, WA_BUTTON_TITLE_MAX),
    },
  }));

  const interactive: Record<string, unknown> = {
    type: 'button',
    body: {
      text: clamp(spec.bodyText || 'Choose an option:', WA_BODY_TEXT_MAX),
    },
    action: { buttons },
  };

  if (spec.headerText?.trim()) {
    interactive.header = {
      type: 'text',
      text: clamp(spec.headerText, WA_HEADER_TEXT_MAX),
    };
  }

  if (spec.footerText?.trim()) {
    interactive.footer = {
      text: clamp(spec.footerText, WA_FOOTER_TEXT_MAX),
    };
  }

  return {
    type: 'interactive',
    interactive,
  };
}

export function buildTelnyxWhatsappInteractiveButtonBody(input: {
  from: string;
  to: string;
  buttons: TelnyxReplyButtonSpec;
  messagingProfileId?: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    from: input.from,
    to: input.to,
    type: 'WHATSAPP',
    whatsapp_message: telnyxInteractiveButtonsFromSpec(input.buttons),
  };
  if (input.messagingProfileId) {
    payload.messaging_profile_id = input.messagingProfileId;
  }
  return payload;
}
