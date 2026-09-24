import type { TechfindMenuOptionId } from './techfind-menu-options';

export type TechfindIntakePayload = {
  serviceId?: TechfindMenuOptionId;
  contactName?: string;
  businessName?: string;
  qualificationDetails?: string;
};
