import {
  formatNumberedOptions,
  type NumberedOption,
} from './match-numbered-option';

export const EVENT_TYPE_OPTIONS: NumberedOption[] = [
  { id: 'wedding', label: 'Wedding', aliases: ['weddings', 'nuptials'] },
  {
    id: 'corporate',
    label: 'Corporate event',
    aliases: ['corporate', 'company', 'office', 'conference'],
  },
  { id: 'birthday', label: 'Birthday', aliases: ['bday', 'birthday party'] },
  {
    id: 'concert',
    label: 'Concert / show',
    aliases: ['concert', 'show', 'gig', 'performance'],
  },
  {
    id: 'other',
    label: 'Something else',
    aliases: ['other', 'something else'],
  },
];

export const SERVICE_OPTIONS: NumberedOption[] = [
  { id: 'sound_pa', label: 'Sound & PA', aliases: ['sound', 'pa', 'audio'] },
  { id: 'lighting', label: 'Lighting', aliases: ['lights'] },
  { id: 'dj', label: 'DJ', aliases: ['disc jockey'] },
  {
    id: 'full',
    label: 'Full package',
    aliases: ['full', 'everything', 'all of it'],
  },
  { id: 'other', label: 'Something else', aliases: ['other'] },
];

export const INTENT_OPTIONS: NumberedOption[] = [
  {
    id: 'quote',
    label: 'Check the date & send a quote',
    aliases: ['quote', 'check the date', 'send a quote'],
  },
  {
    id: 'callback',
    label: 'Talk to the team',
    aliases: ['talk', 'call me', 'speak to someone', 'human'],
  },
];

export const CONFIRM_OPTIONS: NumberedOption[] = [
  {
    id: 'confirm',
    label: 'Yes, send it',
    aliases: ['yes', 'confirm', 'send it'],
  },
  {
    id: 'restart',
    label: 'No, start over',
    aliases: ['no', 'start over', 'wrong', 'restart'],
  },
];

export const eventTypeList = (): string =>
  formatNumberedOptions(EVENT_TYPE_OPTIONS);
export const serviceList = (): string => formatNumberedOptions(SERVICE_OPTIONS);
export const intentList = (): string => formatNumberedOptions(INTENT_OPTIONS);
export const confirmList = (): string => formatNumberedOptions(CONFIRM_OPTIONS);
