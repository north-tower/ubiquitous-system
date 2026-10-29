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
  return (
    serviceId === 'tax_kra' ||
    serviceId === 'tax_health' ||
    serviceId === 'accounting' ||
    serviceId === 'audit' ||
    serviceId === 'payroll' ||
    serviceId === 'something_else'
  );
}

export const HMG_PAYROLL_SIZE_OPTIONS: NumberedOption[] = [
  {
    id: 'size_1_5',
    label: '1–5',
    aliases: ['1-5', '1 to 5', '1–5'],
  },
  {
    id: 'size_6_20',
    label: '6–20',
    aliases: ['6-20', '6 to 20', '6–20'],
  },
  {
    id: 'size_21_50',
    label: '21–50',
    aliases: ['21-50', '21 to 50', '21–50'],
  },
  {
    id: 'size_over_50',
    label: 'Over 50',
    aliases: ['over 50', '50+', 'more than 50'],
  },
];

export function hmgPayrollSizeLabel(payrollSizeId: string): string {
  return (
    HMG_PAYROLL_SIZE_OPTIONS.find((option) => option.id === payrollSizeId)
      ?.label ?? payrollSizeId
  );
}

export const HMG_AUDIT_PURPOSE_OPTIONS: NumberedOption[] = [
  {
    id: 'statutory_audit',
    label: 'Statutory audit',
    aliases: ['statutory', 'statutory audit'],
  },
  {
    id: 'bank_or_lender',
    label: 'A bank or lender',
    aliases: ['bank', 'lender', 'loan'],
  },
  {
    id: 'donor_or_grant',
    label: 'A donor or grant',
    aliases: ['donor', 'grant'],
  },
  {
    id: 'internal_assurance',
    label: 'Internal assurance',
    aliases: ['internal', 'internal assurance', 'assurance'],
  },
];

export function hmgAuditPurposeLabel(auditPurposeId: string): string {
  return (
    HMG_AUDIT_PURPOSE_OPTIONS.find((option) => option.id === auditPurposeId)
      ?.label ?? auditPurposeId
  );
}

export const HMG_BOOKS_HANDLING_OPTIONS: NumberedOption[] = [
  {
    id: 'in_house_accountant',
    label: 'In-house accountant',
    aliases: ['in house', 'in-house', 'internal accountant'],
  },
  {
    id: 'external_accountant',
    label: 'External accountant',
    aliases: ['external', 'outsourced accountant'],
  },
  {
    id: 'spreadsheets_manual',
    label: 'Spreadsheets / manually',
    aliases: ['spreadsheet', 'spreadsheets', 'manual', 'excel'],
  },
  {
    id: 'not_handled_yet',
    label: 'Not really handled yet',
    aliases: ['not handled', 'no books', 'not really handled'],
  },
];

export function hmgBooksHandlingLabel(booksHandlingId: string): string {
  return (
    HMG_BOOKS_HANDLING_OPTIONS.find(
      (option) => option.id === booksHandlingId,
    )?.label ?? booksHandlingId
  );
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

export const HMG_TIMING_OPTIONS: NumberedOption[] = [
  {
    id: 'urgent_deadline',
    label: "It's urgent — there's a deadline",
    aliases: ['urgent', 'deadline', 'urgent deadline'],
  },
  {
    id: 'this_week',
    label: 'This week',
    aliases: ['week', 'this week'],
  },
  {
    id: 'next_week',
    label: 'Next week',
    aliases: ['next week'],
  },
  {
    id: 'exploring',
    label: 'Just exploring for now',
    aliases: ['exploring', 'just exploring'],
  },
];

export function hmgTimingLabel(timingId: string): string {
  return (
    HMG_TIMING_OPTIONS.find((option) => option.id === timingId)?.label ??
    timingId
  );
}

export const HMG_MEETING_OPTIONS: NumberedOption[] = [
  {
    id: 'office_akai_plaza',
    label: 'At your offices, Akai Plaza',
    aliases: ['akai plaza', 'office', 'in person', 'offices'],
  },
  {
    id: 'phone_call',
    label: 'Phone call',
    aliases: ['phone', 'call'],
  },
  {
    id: 'online_meeting',
    label: 'Online meeting',
    aliases: ['online', 'video', 'zoom', 'teams'],
  },
];

export function hmgMeetingLabel(meetingId: string): string {
  return (
    HMG_MEETING_OPTIONS.find((option) => option.id === meetingId)?.label ??
    meetingId
  );
}

export const HMG_PUT_THROUGH_OPTIONS: NumberedOption[] = [
  {
    id: 'book_consultation',
    label: 'Book the consultation',
    aliases: ['book', 'book consultation', 'consultation'],
  },
  {
    id: 'advisor_call_me',
    label: 'Have an advisor call me',
    aliases: ['call me', 'advisor call', 'callback'],
  },
];

export function hmgRequestLabel(requestId: string): string {
  if (requestId === 'advisor_call_me') {
    return 'Advisor call';
  }
  if (requestId === 'book_consultation') {
    return 'Consultation';
  }
  return requestId;
}
