import type { BaileysListMessageSpec } from '../enquiry-flow/enquiry-baileys-interactive';
import type { TelnyxReplyButtonSpec } from '../outbound/telnyx-interactive-button';
import { HMG_SERVICE_OPTIONS } from './hmg-options';
import * as copy from './hmg-copy';

/** First three services as WABA quick-reply buttons (Telnyx). Titles ≤20 chars. */
const HMG_TELNYX_TOPIC_BUTTONS: TelnyxReplyButtonSpec['buttons'] = [
  { id: 'tax_kra', title: '📋 Tax & KRA' },
  { id: 'accounting', title: '📒 Accounting' },
  { id: 'audit', title: '🔍 Audit' },
];

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

function waListRowTitle(optionId: string, fallbackLabel: string): string {
  const preferred = HMG_LIST_ROW_DISPLAY[optionId] ?? fallbackLabel;
  if (preferred.length <= WA_LIST_ROW_TITLE_MAX) {
    return preferred;
  }
  return preferred.slice(0, WA_LIST_ROW_TITLE_MAX).trimEnd();
}

export function hmgTopicButtonMessage(
  intro: string = copy.HMG_GREETING,
): TelnyxReplyButtonSpec {
  return {
    bodyText: copy.hmgTelnyxButtonMenuBody(intro),
    footerText: 'Or reply 4, 5, or 6 for the other services.',
    buttons: HMG_TELNYX_TOPIC_BUTTONS,
  };
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
          description: option.label,
        })),
      },
    ],
  };
}
