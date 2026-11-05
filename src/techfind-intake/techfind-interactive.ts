import {
  stripOptionListFromReply,
  type BaileysListMessageSpec,
} from '../enquiry-flow/enquiry-baileys-interactive';
import {
  formatNumberedOptions,
  type NumberedOption,
} from '../enquiry-flow/match-numbered-option';
import type { WhatsappReplyButtons } from '../outbound/whatsapp-reply-buttons';
import { PLAAGG_FINISH_OPTIONS } from './plaagg-finish-options';
import * as copy from './techfind-intake-copy';
import {
  TECHFIND_SUPPORT_STACK_CHOICES,
  TECHFIND_TOP_MENU_CHOICES,
  TECHFIND_WEB_STACK_CHOICES,
  type TechfindChoice,
} from './techfind-menu-choices';
import { TECHFIND_MENU_OPTIONS } from './techfind-menu-options';

function optionsListMessage(input: {
  replyText: string;
  options: readonly NumberedOption[];
  title: string;
  buttonText: string;
  sectionTitle: string;
}): BaileysListMessageSpec {
  return {
    kind: 'list',
    text: stripOptionListFromReply(input.replyText, input.options),
    title: input.title,
    buttonText: input.buttonText,
    pollSelectableCount: 1,
    sections: [
      {
        title: input.sectionTitle,
        rows: input.options.map((option) => ({
          title: option.label,
          rowId: option.id,
        })),
      },
    ],
  };
}

export function techfindPlaaggIndustryList(
  replyText: string,
  options: readonly NumberedOption[],
): BaileysListMessageSpec {
  return optionsListMessage({
    replyText,
    options,
    title: 'PLAAGG demo',
    buttonText: 'Pick an industry',
    sectionTitle: 'Industries',
  });
}

export function techfindPlaaggFinishList(replyText: string): BaileysListMessageSpec {
  return optionsListMessage({
    replyText,
    options: PLAAGG_FINISH_OPTIONS,
    title: 'Next step',
    buttonText: 'Choose next step',
    sectionTitle: 'After the demo',
  });
}

function choiceButtons(
  intro: string,
  choices: readonly TechfindChoice[],
  fallbackExtra?: string,
): WhatsappReplyButtons {
  const numbered = choices
    .map((choice) => `${choice.numbers[0] ?? ''}  ${choice.label}`.trim())
    .join('\n');
  return {
    text: intro,
    buttons: choices.map((choice) => ({
      id: choice.id,
      title: choice.title,
    })),
    fallbackText: [
      intro,
      ...(fallbackExtra ? ['', fallbackExtra] : []),
      '',
      numbered,
      '',
      copy.TECHFIND_REPLY_WITH_NUMBER,
    ].join('\n'),
  };
}

function optionButtons(input: {
  intro: string;
  options: readonly NumberedOption[];
  titlesById?: Record<string, string>;
  fallbackExtra?: string;
}): WhatsappReplyButtons {
  return {
    text: input.intro,
    buttons: input.options.slice(0, 3).map((option) => ({
      id: option.id,
      title: input.titlesById?.[option.id] ?? option.label.slice(0, 20).trim(),
    })),
    fallbackText: [
      input.intro,
      ...(input.fallbackExtra ? ['', input.fallbackExtra] : []),
      '',
      formatNumberedOptions(input.options),
      '',
      copy.TECHFIND_REPLY_WITH_NUMBER,
    ].join('\n'),
  };
}

export function techfindTopMenuButtons(): WhatsappReplyButtons {
  return {
    text: copy.TECHFIND_MENU_INTRO,
    buttons: TECHFIND_TOP_MENU_CHOICES.map((choice) => ({
      id: choice.id,
      title: choice.title,
    })),
    fallbackText: copy.TECHFIND_MENU_FALLBACK,
  };
}

export function techfindReaskMenuButtons(): WhatsappReplyButtons {
  return {
    text: copy.REASK_MENU_INTRO,
    buttons: TECHFIND_TOP_MENU_CHOICES.map((choice) => ({
      id: choice.id,
      title: choice.title,
    })),
    fallbackText: copy.REASK_MENU,
  };
}

export function techfindWebStackButtons(): WhatsappReplyButtons {
  return choiceButtons('Which service?', TECHFIND_WEB_STACK_CHOICES);
}

export function techfindSupportStackButtons(): WhatsappReplyButtons {
  return choiceButtons('Which one?', TECHFIND_SUPPORT_STACK_CHOICES);
}

const PLAAGG_FINISH_BUTTON_IDS = [
  'book_demo',
  'speak_to_techfind',
  'try_another',
] as const;

const PLAAGG_FINISH_BUTTON_TITLES: Record<string, string> = {
  book_demo: 'Book a demo',
  speak_to_techfind: 'Speak to Techfind',
  try_another: 'Another industry',
};

export function techfindPlaaggFinishButtons(replyText: string): WhatsappReplyButtons {
  const intro = stripOptionListFromReply(replyText, PLAAGG_FINISH_OPTIONS).trim();
  const buttonOptions = PLAAGG_FINISH_OPTIONS.filter((option) =>
    (PLAAGG_FINISH_BUTTON_IDS as readonly string[]).includes(option.id),
  );
  return optionButtons({
    intro,
    options: buttonOptions,
    titlesById: PLAAGG_FINISH_BUTTON_TITLES,
    fallbackExtra: 'Reply *4* for the recommended PLAAGG plan.',
  });
}

export function techfindPlaaggIndustryButtons(
  replyText: string,
  options: readonly NumberedOption[],
): WhatsappReplyButtons {
  const intro = stripOptionListFromReply(replyText, options).trim();
  return optionButtons({ intro, options });
}
