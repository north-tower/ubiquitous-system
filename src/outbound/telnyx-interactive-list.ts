import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';

const WA_LIST_BUTTON_MAX = 20;
const WA_LIST_ROW_TITLE_MAX = 24;
const WA_LIST_SECTION_TITLE_MAX = 24;
const WA_LIST_ROW_DESCRIPTION_MAX = 72;

function clamp(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return trimmed.slice(0, max).trimEnd();
}

export function telnyxInteractiveListFromSpec(
  list: BaileysListMessageSpec,
): Record<string, unknown> {
  const interactive: Record<string, unknown> = {
    type: 'list',
    body: { text: list.text.trim() || 'Choose an option:' },
    action: {
      button: clamp(list.buttonText || 'Choose', WA_LIST_BUTTON_MAX),
      sections: list.sections.map((section) => ({
        title: clamp(section.title || 'Options', WA_LIST_SECTION_TITLE_MAX),
        rows: section.rows.map((row) => ({
          id: row.rowId,
          title: clamp(row.title, WA_LIST_ROW_TITLE_MAX),
          ...(row.description?.trim()
            ? { description: clamp(row.description, WA_LIST_ROW_DESCRIPTION_MAX) }
            : {}),
        })),
      })),
    },
  };

  if (list.title?.trim()) {
    interactive.header = { type: 'text', text: clamp(list.title, 60) };
  }

  return {
    type: 'interactive',
    interactive,
  };
}

export function buildTelnyxWhatsappInteractiveListBody(input: {
  from: string;
  to: string;
  list: BaileysListMessageSpec;
  messagingProfileId?: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    from: input.from,
    to: input.to,
    type: 'WHATSAPP',
    whatsapp_message: telnyxInteractiveListFromSpec(input.list),
  };
  if (input.messagingProfileId) {
    payload.messaging_profile_id = input.messagingProfileId;
  }
  return payload;
}
