import type { WhatsappReplyButtons } from '../outbound/whatsapp-reply-buttons';
import * as copy from './hmg-copy';
import {
  HMG_AUDIT_CHOICES,
  HMG_BOOKS_CHOICES,
  HMG_MEETING_CHOICES,
  HMG_MENU_CHOICES,
  HMG_TAX_CHOICES,
  type HmgChoice,
} from './hmg-options';

function numberedLines(choices: readonly HmgChoice[]): string {
  return choices
    .map((choice) => `${choice.numbers[0]}  ${choice.label}`)
    .join('\n');
}

function buttonMessage(
  intro: string,
  choices: readonly HmgChoice[],
): WhatsappReplyButtons {
  return {
    text: intro,
    fallbackText: [
      intro,
      '',
      numberedLines(choices),
      '',
      copy.HMG_REPLY_WITH_NUMBER,
    ].join('\n'),
    buttons: choices.map((choice) => ({
      id: choice.id,
      title: choice.title,
    })),
  };
}

export function hmgMenuButtons(): WhatsappReplyButtons {
  return buttonMessage(copy.HMG_MENU_INTRO, HMG_MENU_CHOICES);
}

export function hmgTaxButtons(): WhatsappReplyButtons {
  return buttonMessage(copy.HMG_WHICH_ONE, HMG_TAX_CHOICES);
}

export function hmgBooksButtons(): WhatsappReplyButtons {
  return buttonMessage(copy.HMG_WHICH_ONE, HMG_BOOKS_CHOICES);
}

export function hmgAuditButtons(): WhatsappReplyButtons {
  return buttonMessage(copy.HMG_WHICH_ONE, HMG_AUDIT_CHOICES);
}

export function hmgMeetingButtons(): WhatsappReplyButtons {
  return buttonMessage(copy.HMG_MEETING_PROMPT, HMG_MEETING_CHOICES);
}
