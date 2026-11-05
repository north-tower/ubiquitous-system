import type { TechfindMenuOptionId } from './techfind-menu-options';

export type TechfindMenuBranchId = 'techfind_menu_web' | 'techfind_menu_support';

export type TechfindChoice = {
  id: string;
  label: string;
  /** WhatsApp reply-button title (max 20 characters). */
  title: string;
  aliases: readonly string[];
  /** Explicit reply numbers on the original 1–7 scale. */
  numbers: readonly string[];
};

export const TECHFIND_TOP_MENU_CHOICES: readonly TechfindChoice[] = [
  {
    id: 'techfind_menu_web',
    label: 'Web & software',
    title: 'Web & software',
    aliases: ['web and software', 'web software', 'website crm'],
    numbers: [],
  },
  {
    id: 'plaagg',
    label: 'Explore PLAAGG',
    title: 'Explore PLAAGG',
    aliases: ['plaagg', 'demo', 'industry demo'],
    numbers: ['4'],
  },
  {
    id: 'techfind_menu_support',
    label: 'Training & support',
    title: 'Training & support',
    aliases: ['training and support', 'support', 'training'],
    numbers: [],
  },
];

export const TECHFIND_WEB_STACK_CHOICES: readonly TechfindChoice[] = [
  {
    id: 'website',
    label: 'Website',
    title: 'Website',
    aliases: ['web', 'site', 'web design'],
    numbers: ['1'],
  },
  {
    id: 'crm',
    label: 'Business software / CRM',
    title: 'CRM & software',
    aliases: ['crm', 'software', 'erp'],
    numbers: ['2'],
  },
  {
    id: 'whatsapp_automation',
    label: 'WhatsApp automation',
    title: 'WhatsApp bots',
    aliases: ['whatsapp', 'automation', 'bot'],
    numbers: ['3'],
  },
];

export const TECHFIND_SUPPORT_STACK_CHOICES: readonly TechfindChoice[] = [
  {
    id: 'ai_training',
    label: 'AI training',
    title: 'AI training',
    aliases: ['training', 'ai', 'workshop'],
    numbers: ['5'],
  },
  {
    id: 'existing_client',
    label: 'Existing-client support',
    title: 'Existing client',
    aliases: ['support', 'existing client', 'client support'],
    numbers: ['6'],
  },
  {
    id: 'speak_to_team',
    label: 'Speak to the team',
    title: 'Speak to team',
    aliases: ['human', 'agent', 'team', 'call me'],
    numbers: ['7'],
  },
];

export function matchTechfindChoice(
  text: string,
  choices: readonly TechfindChoice[],
): TechfindChoice | null {
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

/** Top-level menu: numbered 1–7 services, then branch buttons, then service names. */
export function matchTechfindTopMenu(
  text: string,
):
  | { type: 'branch'; id: TechfindMenuBranchId }
  | { type: 'service'; id: TechfindMenuOptionId }
  | null {
  const branch = matchTechfindChoice(text, TECHFIND_TOP_MENU_CHOICES);
  if (branch?.id === 'techfind_menu_web') {
    return { type: 'branch', id: 'techfind_menu_web' };
  }
  if (branch?.id === 'techfind_menu_support') {
    return { type: 'branch', id: 'techfind_menu_support' };
  }
  if (branch?.id === 'plaagg') {
    return { type: 'service', id: 'plaagg' };
  }

  const web = matchTechfindChoice(text, TECHFIND_WEB_STACK_CHOICES);
  if (web) {
    return { type: 'service', id: web.id as TechfindMenuOptionId };
  }
  const support = matchTechfindChoice(text, TECHFIND_SUPPORT_STACK_CHOICES);
  if (support) {
    return { type: 'service', id: support.id as TechfindMenuOptionId };
  }
  return null;
}

function normalizeChoice(text: string): string {
  return text
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[?!.]/g, '')
    .replace(/\s+/g, ' ');
}
