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
  {
    id: 'birthday',
    label: 'Birthday or party',
    aliases: ['birthday', 'bday', 'birthday party'],
  },
  {
    id: 'church',
    label: 'Church event',
    aliases: ['church', 'church service'],
  },
  {
    id: 'concert',
    label: 'Concert or show',
    aliases: ['concert', 'show', 'gig', 'performance', 'concert / show'],
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

export const BUDGET_OPTIONS: NumberedOption[] = [
  {
    id: 'under50',
    label: 'Under KES 50,000',
    aliases: ['under 50k', 'under 50,000', 'below 50k', 'less than 50k'],
  },
  {
    id: '50_150',
    label: 'KES 50,000–150,000',
    aliases: ['50-150k', '50k-150k', '50 to 150k'],
  },
  {
    id: '150_300',
    label: 'KES 150,000–300,000',
    aliases: ['150-300k', '150k-300k'],
  },
  {
    id: '300plus',
    label: 'KES 300,000+',
    aliases: ['300k+', '300k plus', 'over 300k', 'above 300k'],
  },
  {
    id: 'unsure',
    label: 'Not sure yet',
    aliases: ['not sure', 'unsure', 'tbd', "don't know", 'dont know'],
  },
];

export const CONFIRM_OPTIONS: NumberedOption[] = [
  {
    id: 'confirm',
    label: 'Yes, send it',
    aliases: ['yes', 'confirm', 'send it'],
  },
  {
    id: 'edit',
    label: 'Edit something',
    aliases: ['edit', 'no', 'change', 'fix', 'wrong', 'start over', 'restart'],
  },
];

export const BUDGET_CONFIRM_OPTIONS: NumberedOption[] = [
  {
    id: 'keep',
    label: 'Send it as is',
    aliases: ['send', 'as is', 'keep', 'yes', 'ok', 'okay'],
  },
  {
    id: 'adjust',
    label: 'Adjust the budget',
    aliases: ['adjust', 'change', 'no', 'edit'],
  },
];

export const EDIT_FIELD_OPTIONS: NumberedOption[] = [
  { id: 'eventType', label: 'Event type', aliases: ['event', 'type'] },
  { id: 'date', label: 'Date', aliases: ['when'] },
  { id: 'services', label: 'Services', aliases: ['package'] },
  { id: 'guests', label: 'Guests', aliases: ['guest count', 'numbers'] },
  { id: 'venue', label: 'Venue', aliases: ['place', 'location', 'town'] },
  { id: 'budget', label: 'Budget', aliases: ['price', 'cost'] },
  { id: 'details', label: 'Extra details', aliases: ['notes', 'details'] },
  { id: 'name', label: 'Name', aliases: ['contact name'] },
  { id: 'phone', label: 'Phone', aliases: ['number'] },
];

export const eventTypeList = (): string =>
  formatNumberedOptions(EVENT_TYPE_OPTIONS);
export const serviceList = (): string => formatNumberedOptions(SERVICE_OPTIONS);
export const returningList = (): string =>
  formatNumberedOptions(RETURNING_OPTIONS);
export const budgetList = (): string => formatNumberedOptions(BUDGET_OPTIONS);
export const confirmList = (): string => formatNumberedOptions(CONFIRM_OPTIONS);
export const budgetConfirmList = (): string =>
  formatNumberedOptions(BUDGET_CONFIRM_OPTIONS);
export const editFieldList = (): string =>
  formatNumberedOptions(EDIT_FIELD_OPTIONS);
