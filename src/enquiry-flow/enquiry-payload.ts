import { isLikelyPersonName } from './is-person-name';

export type EnquiryPayload = {
  eventType?: string;
  eventDate?: string;
  eventDateDisplay?: string;
  requestedServices?: string;
  guestEstimate?: number;
  guestEstimateRaw?: string;
  venue?: string;
  venueTown?: string;
  venueSite?: string;
  budgetRange?: string;
  budgetAmountKes?: number;
  budgetLooksLow?: boolean;
  additionalDetails?: string;
  wantsCallback?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactPhoneNormalized?: string;
  openEnquiryReference?: string;
  upcomingEventTitle?: string;
  upcomingEventDateDisplay?: string;
  upcomingEventStatus?: string;
  returnToConfirm?: boolean;
};

export function identityFromPayload(payload: EnquiryPayload | undefined): {
  contactName?: string;
  contactPhone?: string;
  contactPhoneNormalized?: string;
} {
  const contactName = isLikelyPersonName(payload?.contactName)
    ? payload?.contactName
    : undefined;
  if (!contactName && !payload?.contactPhoneNormalized) {
    return {};
  }
  return {
    contactName,
    contactPhone: payload?.contactPhone,
    contactPhoneNormalized: payload?.contactPhoneNormalized,
  };
}

export function hasPrefillIdentity(payload: EnquiryPayload): boolean {
  return Boolean(
    isLikelyPersonName(payload.contactName) && payload.contactPhoneNormalized,
  );
}
