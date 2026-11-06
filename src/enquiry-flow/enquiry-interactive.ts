import { stripOptionListFromReply } from './enquiry-baileys-interactive';
import {
  BUDGET_CONFIRM_OPTIONS,
  CONFIRM_OPTIONS,
  PHONE_OPTIONS,
  RETURNING_OPTIONS,
} from './enquiry-options';
import { ENQUIRY_STEPS, type EnquiryStep } from './enquiry-steps';
import {
  formatNumberedOptions,
  type NumberedOption,
} from './match-numbered-option';
import type { WhatsappReplyButtons } from '../outbound/whatsapp-reply-buttons';

const ENQUIRY_REPLY_WITH_NUMBER =
  'Reply with a number if the buttons do not show.';

const BUTTON_TITLES: Record<string, string> = {
  wait: 'Wait for the team',
  new: 'Start a new enquiry',
  keep: 'Send it as is',
  adjust: 'Adjust the budget',
  confirm: 'Yes, send it',
  edit: 'Edit something',
  use_whatsapp: 'Use this number',
};

const BUTTON_OPTIONS_BY_STEP: Partial<
  Record<EnquiryStep, readonly NumberedOption[]>
> = {
  [ENQUIRY_STEPS.AWAITING_RETURNING_CHOICE]: RETURNING_OPTIONS,
  [ENQUIRY_STEPS.AWAITING_BUDGET_CONFIRM]: BUDGET_CONFIRM_OPTIONS,
  [ENQUIRY_STEPS.AWAITING_CONFIRM]: CONFIRM_OPTIONS,
  [ENQUIRY_STEPS.AWAITING_PHONE]: PHONE_OPTIONS,
};

export function enquiryButtonsForStep(
  step: EnquiryStep,
  replyText: string,
): WhatsappReplyButtons | undefined {
  const options = BUTTON_OPTIONS_BY_STEP[step];
  if (!options || options.length === 0 || options.length > 3) {
    return undefined;
  }
  return optionButtons(replyText, options);
}

function optionButtons(
  replyText: string,
  options: readonly NumberedOption[],
): WhatsappReplyButtons {
  const intro = stripOptionListFromReply(replyText, options).trim();
  return {
    text: intro,
    buttons: options.map((option) => ({
      id: option.id,
      title: BUTTON_TITLES[option.id] ?? option.label.slice(0, 20).trim(),
    })),
    fallbackText: [
      intro,
      '',
      formatNumberedOptions(options),
      '',
      ENQUIRY_REPLY_WITH_NUMBER,
    ].join('\n'),
  };
}
