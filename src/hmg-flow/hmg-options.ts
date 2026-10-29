import type { NumberedOption } from '../enquiry-flow/match-numbered-option';

/** HMG service menu — row ids match Telnyx / WhatsApp list_reply.id */
export const HMG_SERVICE_OPTIONS: NumberedOption[] = [
  {
    id: 'tax_kra',
    label: 'Tax & KRA advisory',
    aliases: ['tax', 'kra', 'tax kra'],
  },
  {
    id: 'accounting',
    label: 'Accounting & bookkeeping',
    aliases: ['accounting', 'bookkeeping', 'books'],
  },
  {
    id: 'audit',
    label: 'Audit & assurance',
    aliases: ['audit', 'assurance'],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    aliases: ['payroll', 'salaries'],
  },
  {
    id: 'tax_health',
    label: 'Tax health check',
    aliases: ['tax health', 'health check'],
  },
  {
    id: 'something_else',
    label: 'Something else',
    aliases: ['other', 'something else', 'else'],
  },
];

export function hmgServiceLabel(serviceId: string): string {
  return (
    HMG_SERVICE_OPTIONS.find((option) => option.id === serviceId)?.label ??
    serviceId
  );
}

/** Tax & KRA path — entity type before the brief (matches HMG WhatsApp design). */
export const HMG_ENTITY_OPTIONS: NumberedOption[] = [
  {
    id: 'limited_company',
    label: 'Limited company',
    aliases: ['limited', 'company', 'ltd'],
  },
  {
    id: 'sole_proprietor',
    label: 'Sole proprietor',
    aliases: ['sole', 'proprietor', 'sole prop'],
  },
  {
    id: 'ngo_sacco_trust',
    label: 'NGO / SACCO / Trust',
    aliases: ['ngo', 'sacco', 'trust'],
  },
  {
    id: 'personal',
    label: 'Personal',
    aliases: ['individual', 'personal tax'],
  },
];

export function hmgEntityLabel(entityId: string): string {
  return (
    HMG_ENTITY_OPTIONS.find((option) => option.id === entityId)?.label ??
    entityId
  );
}

export function hmgServiceNeedsEntityStep(serviceId: string): boolean {
  return serviceId === 'tax_kra';
}

export function hmgEntityIsPersonal(entityId: string): boolean {
  return entityId === 'personal';
}

export const HMG_KRA_STATUS_OPTIONS: NumberedOption[] = [
  {
    id: 'filings_up_to_date',
    label: 'All filings up to date',
    aliases: ['up to date', 'filings up to date', 'all filings'],
  },
  {
    id: 'behind_filings',
    label: 'Behind on some filings',
    aliases: ['behind', 'behind on filings'],
  },
  {
    id: 'kra_notice',
    label: "We've received a KRA notice",
    aliases: ['kra notice', 'notice from kra', 'received a notice'],
  },
  {
    id: 'not_sure',
    label: 'Honestly not sure',
    aliases: ['not sure', 'unsure'],
  },
];

export function hmgKraStatusLabel(kraStatusId: string): string {
  return (
    HMG_KRA_STATUS_OPTIONS.find((option) => option.id === kraStatusId)?.label ??
    kraStatusId
  );
}
