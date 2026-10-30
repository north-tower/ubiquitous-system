export type HmgMenuId = 'tax' | 'books' | 'audit_other';

export type HmgServiceId =
  | 'tax_kra'
  | 'accounting'
  | 'audit'
  | 'payroll'
  | 'tax_health'
  | 'something_else';

export type HmgMeetingId = 'call_me' | 'video_call' | 'in_person';

export type HmgChoice = {
  id: string;
  /** Saved and shown in the numbered fallback. */
  label: string;
  /** WhatsApp reply-button title. Max 20 characters. */
  title: string;
  aliases: readonly string[];
  /** Explicit reply numbers. Not the row position. */
  numbers: readonly string[];
};

export const HMG_MENU_CHOICES: readonly HmgChoice[] = [
  {
    id: 'tax',
    label: 'Tax',
    title: 'Tax',
    aliases: ['tax'],
    numbers: ['1'],
  },
  {
    id: 'books',
    label: 'Books & people',
    title: 'Books & people',
    aliases: ['books', 'books and people'],
    numbers: ['2'],
  },
  {
    id: 'audit_other',
    label: 'Audit & other',
    title: 'Audit & other',
    aliases: ['audit', 'audit and other'],
    numbers: ['3'],
  },
];

/**
 * Service numbers stay on the original 1–6 scale so a reply of 5 still
 * means Tax health check after the Tax button, not "the second button".
 */
export const HMG_SERVICE_CHOICES: readonly HmgChoice[] = [
  {
    id: 'tax_kra',
    label: 'Tax & KRA advisory',
    title: 'Tax & KRA advisory',
    aliases: ['kra', 'tax kra', 'tax and kra', 'kra advisory'],
    numbers: ['1'],
  },
  {
    id: 'accounting',
    label: 'Accounting & bookkeeping',
    title: 'Accounting & books',
    aliases: [
      'accounting',
      'bookkeeping',
      'accounting and bookkeeping',
      'accounting and books',
    ],
    numbers: ['2'],
  },
  {
    id: 'audit',
    label: 'Audit & assurance',
    title: 'Audit & assurance',
    aliases: ['assurance', 'audit and assurance'],
    numbers: ['3'],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    title: 'Payroll',
    aliases: ['payroll', 'salaries'],
    numbers: ['4'],
  },
  {
    id: 'tax_health',
    label: 'Tax health check',
    title: 'Tax health check',
    aliases: ['tax health', 'health check'],
    numbers: ['5'],
  },
  {
    id: 'something_else',
    label: 'Something else',
    title: 'Something else',
    aliases: ['something else', 'something_else'],
    numbers: ['6'],
  },
];

export const HMG_TAX_CHOICES = choicesById(['tax_kra', 'tax_health']);
export const HMG_BOOKS_CHOICES = choicesById(['accounting', 'payroll']);
export const HMG_AUDIT_CHOICES = choicesById(['audit', 'something_else']);

export const HMG_MEETING_CHOICES: readonly HmgChoice[] = [
  {
    id: 'call_me',
    label: 'Call me',
    title: 'Call me',
    aliases: ['call', 'phone', 'phone call'],
    numbers: ['1'],
  },
  {
    id: 'video_call',
    label: 'Video call',
    title: 'Video call',
    aliases: ['video', 'online', 'online meeting'],
    numbers: ['2'],
  },
  {
    id: 'in_person',
    label: 'In person',
    title: 'In person',
    aliases: ['office', 'in person', 'akai plaza'],
    numbers: ['3'],
  },
];

export function hmgServiceLabel(serviceId: string): string {
  return (
    HMG_SERVICE_CHOICES.find((choice) => choice.id === serviceId)?.label ??
    serviceId
  );
}

export function hmgMeetingLabel(meetingId: string): string {
  return (
    HMG_MEETING_CHOICES.find((choice) => choice.id === meetingId)?.label ??
    meetingId
  );
}

export function matchHmgChoice(
  text: string,
  choices: readonly HmgChoice[],
): HmgChoice | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const numbered = trimmed.match(/^(?:option\s*)?(\d+)\s*[.)]?$/i);
  if (numbered) {
    const number = numbered[1];
    return choices.find((choice) => choice.numbers.includes(number)) ?? null;
  }

  const haystack = normalizeChoice(trimmed);
  const ranked = choices
    .flatMap((choice) =>
      [choice.id, choice.label, choice.title, ...choice.aliases].map(
        (alias) => ({
          choice,
          alias: normalizeChoice(alias),
        }),
      ),
    )
    .filter((row) => row.alias.length > 0)
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { choice, alias } of ranked) {
    if (haystack === alias) {
      return choice;
    }
  }
  return null;
}

/** Menu numbers and labels first, then a specific service name. */
export function matchHmgMenu(
  text: string,
):
  | { type: 'menu'; id: HmgMenuId }
  | { type: 'service'; id: HmgServiceId }
  | null {
  const menu = matchHmgChoice(text, HMG_MENU_CHOICES);
  if (menu) {
    return { type: 'menu', id: menu.id as HmgMenuId };
  }
  const service = matchHmgChoice(
    text,
    HMG_SERVICE_CHOICES.map((choice) => ({ ...choice, numbers: [] })),
  );
  if (service) {
    return { type: 'service', id: service.id as HmgServiceId };
  }
  return null;
}

function choicesById(ids: readonly string[]): HmgChoice[] {
  return ids.map((id) => {
    const choice = HMG_SERVICE_CHOICES.find((row) => row.id === id);
    if (!choice) {
      throw new Error(`Unknown HMG service choice ${id}`);
    }
    return choice;
  });
}

function normalizeChoice(text: string): string {
  return text
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[?!.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
