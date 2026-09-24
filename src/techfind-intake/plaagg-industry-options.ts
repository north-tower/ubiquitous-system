import type { NumberedOption } from '../enquiry-flow/match-numbered-option';

export const PLAAGG_INDUSTRY_OPTIONS = [
  { id: 'solar', label: 'Solar', aliases: ['solar power', 'panels'] },
  {
    id: 'salon_beauty',
    label: 'Salon / Beauty',
    aliases: ['salon', 'beauty', 'hair'],
  },
  { id: 'dental', label: 'Dental', aliases: ['dentist', 'clinic'] },
  {
    id: 'wines_spirits',
    label: 'Wines & Spirits',
    aliases: ['wine', 'liquor', 'spirits'],
  },
  { id: 'events', label: 'Events', aliases: ['wedding', 'party', 'event'] },
  { id: 'other', label: 'Other', aliases: ['other industry', 'something else'] },
] as const satisfies readonly NumberedOption[];

export type PlaaggIndustryId = (typeof PLAAGG_INDUSTRY_OPTIONS)[number]['id'];

export function plaaggIndustryToDemoMode(
  industryId: PlaaggIndustryId,
  otherLabel?: string,
): string {
  switch (industryId) {
    case 'solar':
      return 'solar';
    case 'salon_beauty':
      return 'salon';
    case 'dental':
      return 'dental';
    case 'wines_spirits':
      return 'wines_spirits';
    case 'events':
      return 'events';
    case 'other':
      return otherLabel?.trim() ? 'generic' : 'generic';
    default:
      return 'generic';
  }
}

export function plaaggIndustryLabel(
  industryId: PlaaggIndustryId,
  otherLabel?: string,
): string {
  if (industryId === 'other' && otherLabel?.trim()) {
    return otherLabel.trim();
  }
  return (
    PLAAGG_INDUSTRY_OPTIONS.find((option) => option.id === industryId)?.label ??
    industryId
  );
}
