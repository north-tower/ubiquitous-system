import type { NumberedOption } from '../enquiry-flow/match-numbered-option';

export const PLAAGG_FINISH_OPTIONS = [
  {
    id: 'book_demo',
    label: 'Book a personalized demo',
    aliases: ['book demo', 'demo call', 'schedule'],
  },
  {
    id: 'speak_to_techfind',
    label: 'Speak to Techfind',
    aliases: ['speak', 'human', 'team'],
  },
  {
    id: 'try_another',
    label: 'Try another industry',
    aliases: ['another industry', 'another demo', 'again'],
  },
  {
    id: 'recommended_plan',
    label: 'Recommended PLAAGG plan',
    aliases: ['plan', 'pricing', 'modules'],
  },
] as const satisfies readonly NumberedOption[];

export type PlaaggFinishOptionId =
  (typeof PLAAGG_FINISH_OPTIONS)[number]['id'];
