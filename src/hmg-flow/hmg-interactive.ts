import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';
import {
  HMG_ENTITY_OPTIONS,
  HMG_AUDIT_PURPOSE_OPTIONS,
  HMG_BOOKS_HANDLING_OPTIONS,
  HMG_KRA_STATUS_OPTIONS,
  HMG_MEETING_OPTIONS,
  HMG_PUT_THROUGH_OPTIONS,
  HMG_SERVICE_OPTIONS,
  HMG_TIMING_OPTIONS,
} from './hmg-options';
import * as copy from './hmg-copy';

/** WhatsApp list row titles are capped at 24 characters (Meta Cloud API). */
const WA_LIST_ROW_TITLE_MAX = 24;

const HMG_LIST_ROW_DISPLAY: Record<string, string> = {
  tax_kra: '📋 Tax & KRA advisory',
  accounting: '📒 Accounting & books',
  audit: '🔍 Audit & assurance',
  payroll: '👥 Payroll',
  tax_health: '🩺 Tax health check',
  something_else: '💬 Something else',
};

const HMG_ENTITY_ROW_DISPLAY: Record<string, string> = {
  limited_company: '🏢 Limited company',
  sole_proprietor: '💼 Sole proprietor',
  ngo_sacco_trust: '🤝 NGO / SACCO / Trust',
  personal: '👤 Personal',
};

const HMG_AUDIT_PURPOSE_ROW_DISPLAY: Record<string, string> = {
  statutory_audit: 'Statutory audit',
  bank_or_lender: 'A bank or lender',
  donor_or_grant: 'A donor or grant',
  internal_assurance: 'Internal assurance',
};

const HMG_KRA_STATUS_ROW_DISPLAY: Record<string, string> = {
  filings_up_to_date: '✅ All filings up to date',
  behind_filings: '⏳ Behind on some filings',
  kra_notice: "⚠️ We've received a KRA notice",
  not_sure: '❓ Honestly not sure',
};

const HMG_BOOKS_HANDLING_ROW_DISPLAY: Record<string, string> = {
  in_house_accountant: 'In-house accountant',
  external_accountant: 'External accountant',
  spreadsheets_manual: 'Spreadsheets / manually',
  not_handled_yet: 'Not really handled yet',
};

const HMG_TIMING_ROW_DISPLAY: Record<string, string> = {
  urgent_deadline: "🔥 It's urgent — deadline",
  this_week: 'This week',
  next_week: 'Next week',
  exploring: 'Just exploring for now',
};

const HMG_MEETING_ROW_DISPLAY: Record<string, string> = {
  office_akai_plaza: '🏢 At your offices, Akai Plaza',
  phone_call: '📞 Phone call',
  online_meeting: '💻 Online meeting',
};

const HMG_PUT_THROUGH_ROW_DISPLAY: Record<string, string> = {
  book_consultation: '🗓️ Book the consultation',
  advisor_call_me: '📞 Have an advisor call me',
};

function waListRowTitle(optionId: string, fallbackLabel: string): string {
  const preferred =
    HMG_LIST_ROW_DISPLAY[optionId] ??
    HMG_ENTITY_ROW_DISPLAY[optionId] ??
    HMG_AUDIT_PURPOSE_ROW_DISPLAY[optionId] ??
    HMG_KRA_STATUS_ROW_DISPLAY[optionId] ??
    HMG_BOOKS_HANDLING_ROW_DISPLAY[optionId] ??
    HMG_TIMING_ROW_DISPLAY[optionId] ??
    HMG_MEETING_ROW_DISPLAY[optionId] ??
    HMG_PUT_THROUGH_ROW_DISPLAY[optionId] ??
    fallbackLabel;
  if (preferred.length <= WA_LIST_ROW_TITLE_MAX) {
    return preferred;
  }
  return preferred.slice(0, WA_LIST_ROW_TITLE_MAX).trimEnd();
}

export function hmgTopicListMessage(): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: copy.HMG_GREETING,
    title: 'HMG Group Africa',
    buttonText: 'Choose a service',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'Services',
        rows: HMG_SERVICE_OPTIONS.map((option) => ({
          rowId: option.id,
          title: waListRowTitle(option.id, option.label),
        })),
      },
    ],
  };
}

export function hmgEntityListMessage(): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: copy.HMG_ENTITY_PROMPT,
    title: 'Client type',
    buttonText: 'Choose type',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'Who is this for?',
        rows: HMG_ENTITY_OPTIONS.map((option) => ({
          rowId: option.id,
          title: waListRowTitle(
            option.id,
            HMG_ENTITY_ROW_DISPLAY[option.id] ?? option.label,
          ),
        })),
      },
    ],
  };
}

export function hmgAuditPurposeListMessage(): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: copy.HMG_AUDIT_PURPOSE_PROMPT,
    title: 'Audit purpose',
    buttonText: 'Choose purpose',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'What is it for?',
        rows: HMG_AUDIT_PURPOSE_OPTIONS.map((option) => ({
          rowId: option.id,
          title: waListRowTitle(
            option.id,
            HMG_AUDIT_PURPOSE_ROW_DISPLAY[option.id] ?? option.label,
          ),
        })),
      },
    ],
  };
}

export function hmgKraStatusListMessage(): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: copy.HMG_KRA_STATUS_PROMPT,
    title: 'KRA status',
    buttonText: 'Choose status',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'Current situation',
        rows: HMG_KRA_STATUS_OPTIONS.map((option) => ({
          rowId: option.id,
          title: waListRowTitle(
            option.id,
            HMG_KRA_STATUS_ROW_DISPLAY[option.id] ?? option.label,
          ),
        })),
      },
    ],
  };
}

export function hmgBooksHandlingListMessage(): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: copy.HMG_BOOKS_HANDLING_PROMPT,
    title: 'Bookkeeping',
    buttonText: 'Choose option',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'How books are handled',
        rows: HMG_BOOKS_HANDLING_OPTIONS.map((option) => ({
          rowId: option.id,
          title: waListRowTitle(
            option.id,
            HMG_BOOKS_HANDLING_ROW_DISPLAY[option.id] ?? option.label,
          ),
        })),
      },
    ],
  };
}

export function hmgTimingListMessage(): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: copy.HMG_TIMING_PROMPT,
    title: 'Timing',
    buttonText: 'Choose timing',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'How soon?',
        rows: HMG_TIMING_OPTIONS.map((option) => ({
          rowId: option.id,
          title: waListRowTitle(
            option.id,
            HMG_TIMING_ROW_DISPLAY[option.id] ?? option.label,
          ),
        })),
      },
    ],
  };
}

export function hmgMeetingListMessage(): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: copy.HMG_MEETING_PROMPT,
    title: 'Meeting',
    buttonText: 'Choose format',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'Preferred format',
        rows: HMG_MEETING_OPTIONS.map((option) => ({
          rowId: option.id,
          title: waListRowTitle(
            option.id,
            HMG_MEETING_ROW_DISPLAY[option.id] ?? option.label,
          ),
        })),
      },
    ],
  };
}

export function hmgPutThroughListMessage(): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: copy.HMG_PUT_THROUGH_PROMPT,
    title: 'Next step',
    buttonText: 'Choose action',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'How should we proceed?',
        rows: HMG_PUT_THROUGH_OPTIONS.map((option) => ({
          rowId: option.id,
          title: waListRowTitle(
            option.id,
            HMG_PUT_THROUGH_ROW_DISPLAY[option.id] ?? option.label,
          ),
        })),
      },
    ],
  };
}
