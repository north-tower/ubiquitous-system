import {
  formatNumberedOptions,
  type NumberedOption,
} from './match-numbered-option';
import { EVENT_TYPE_OPTIONS } from './enquiry-options';
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
};

const ENQUIRY_BAILEYS_LIST_BY_STEP: Partial<
  Record<EnquiryStep, (replyText: string) => BaileysListMessageSpec>
> = {
  [ENQUIRY_STEPS.AWAITING_EVENT_TYPE]: (replyText) =>
    eventTypeListMessage(replyText),
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
