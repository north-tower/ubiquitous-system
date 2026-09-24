import type { NumberedOption } from '../enquiry-flow/match-numbered-option';

export const TECHFIND_MENU_OPTIONS = [
  {
    id: 'website',
    label: 'Website',
    aliases: ['web', 'site', 'web design'],
  },
  {
    id: 'crm',
    label: 'Business software / CRM',
    aliases: ['crm', 'software', 'erp'],
  },
  {
    id: 'whatsapp_automation',
    label: 'WhatsApp automation',
    aliases: ['whatsapp', 'automation', 'bot'],
  },
  {
    id: 'plaagg',
    label: 'Explore PLAAGG',
    aliases: ['plaagg', 'demo', 'industry demo'],
  },
  {
    id: 'ai_training',
    label: 'AI training',
    aliases: ['training', 'ai', 'workshop'],
  },
  {
    id: 'existing_client',
    label: 'Existing-client support',
    aliases: ['support', 'existing client', 'client support'],
  },
  {
    id: 'speak_to_team',
    label: 'Speak to the team',
    aliases: ['human', 'agent', 'team', 'call me'],
  },
] as const satisfies readonly NumberedOption[];

export type TechfindMenuOptionId =
  (typeof TECHFIND_MENU_OPTIONS)[number]['id'];

export function techfindMenuLabel(id: TechfindMenuOptionId): string {
  return TECHFIND_MENU_OPTIONS.find((option) => option.id === id)?.label ?? id;
}
