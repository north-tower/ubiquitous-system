import type { PlaaggFinishOptionId } from './plaagg-finish-options';
import type { PlaaggIndustryId } from './plaagg-industry-options';
import type { TechfindMenuOptionId } from './techfind-menu-options';

export type TechfindIntakePayload = {
  serviceId?: TechfindMenuOptionId;
  contactName?: string;
  businessName?: string;
  qualificationDetails?: string;
  plaaggIndustryId?: PlaaggIndustryId;
  plaaggIndustryLabel?: string;
  plaaggOtherLabel?: string;
  plaaggDemoMode?: string;
  plaaggLastDemoSummary?: string;
  plaaggFinishChoice?: PlaaggFinishOptionId;
};
