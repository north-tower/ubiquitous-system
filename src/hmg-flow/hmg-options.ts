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
