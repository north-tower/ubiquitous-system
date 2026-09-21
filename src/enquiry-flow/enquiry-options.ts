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

export const RETURNING_OPTIONS: NumberedOption[] = [
  {
    id: 'wait',
    label: "I'll wait for the team",
    aliases: ['wait', "i'll wait", 'ok', 'okay', 'that one', 'existing'],
  },
  {
    id: 'new',
    label: 'Start a new enquiry',
    aliases: [
      'new',
      'new enquiry',
      'new event',
      'another event',
      'start a new enquiry',
    ],
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
export const returningList = (): string =>
  formatNumberedOptions(RETURNING_OPTIONS);
export const confirmList = (): string => formatNumberedOptions(CONFIRM_OPTIONS);
