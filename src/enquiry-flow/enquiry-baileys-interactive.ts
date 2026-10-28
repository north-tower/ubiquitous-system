import {
  formatNumberedOptions,
  type NumberedOption,
} from './match-numbered-option';
import {
  BUDGET_OPTIONS,
  EVENT_TYPE_OPTIONS,
  SERVICE_OPTIONS,
} from './enquiry-options';
import { ENQUIRY_STEPS, type EnquiryStep } from './enquiry-steps';

export type BaileysListRow = {
  title: string;
  rowId: string;
  description?: string;
};

export type BaileysListMessageSpec = {
  kind: 'list';
  text: string;
  title: string;
  buttonText: string;
  sections: { title: string; rows: BaileysListRow[] }[];
  /** Poll taps allowed (default 1). Use options.length for multi-select. */
  pollSelectableCount?: number;
};

const ENQUIRY_BAILEYS_LIST_BY_STEP: Partial<
  Record<EnquiryStep, (replyText: string) => BaileysListMessageSpec>
> = {
  [ENQUIRY_STEPS.AWAITING_EVENT_TYPE]: (replyText) =>
    eventTypeListMessage(replyText),
  [ENQUIRY_STEPS.AWAITING_SERVICES]: (replyText) =>
    servicesListMessage(replyText),
  [ENQUIRY_STEPS.AWAITING_BUDGET]: (replyText) =>
    budgetListMessage(replyText),
};

export function enquiryBaileysListForStep(
  step: EnquiryStep,
  replyText: string,
): BaileysListMessageSpec | undefined {
  return ENQUIRY_BAILEYS_LIST_BY_STEP[step]?.(replyText);
}

function eventTypeListMessage(replyText: string): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: stripOptionListFromReply(replyText, EVENT_TYPE_OPTIONS),
    title: 'What are you planning?',
    buttonText: 'Choose event type',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'Event type',
        rows: EVENT_TYPE_OPTIONS.map((option) => ({
          title: option.label,
          rowId: option.id,
        })),
      },
    ],
  };
}

function budgetListMessage(replyText: string): BaileysListMessageSpec {
  const intro = stripOptionListFromReply(replyText, BUDGET_OPTIONS);
  return {
    kind: 'list',
    text: [
      intro,
      '',
      'Or type *skip* or an amount (e.g. *80k*) in chat.',
    ].join('\n'),
    title: 'Budget range',
    buttonText: 'Choose budget range',
    pollSelectableCount: 1,
    sections: [
      {
        title: 'Budget',
        rows: BUDGET_OPTIONS.map((option) => ({
          title: option.label,
          rowId: option.id,
        })),
      },
    ],
  };
}

function servicesListMessage(replyText: string): BaileysListMessageSpec {
  const rows = SERVICE_OPTIONS.map((option) => ({
    title: option.label,
    rowId: option.id,
  }));
  return {
    kind: 'list',
    text: stripOptionListFromReply(replyText, SERVICE_OPTIONS),
    title: 'Services',
    buttonText: 'Choose services (pick all that apply)',
    pollSelectableCount: rows.length,
    sections: [{ title: 'Services', rows }],
  };
}

/** Drop numbered menu lines from copy when the same choices go out as a list. */
export function stripOptionListFromReply(
  replyText: string,
  options: readonly NumberedOption[],
): string {
  const block = formatNumberedOptions(options);
  const idx = replyText.indexOf(block);
  if (idx >= 0) {
    return replyText.slice(0, idx).trimEnd();
  }
  const lines = replyText.split('\n');
  const firstNumbered = lines.findIndex((line) => /^\d+\s+\S/.test(line.trim()));
  if (firstNumbered > 0) {
    return lines.slice(0, firstNumbered).join('\n').trimEnd();
  }
  return replyText.trim();
}
