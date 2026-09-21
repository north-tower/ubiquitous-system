export type EnquiryPayload = {
  eventType?: string;
  eventDate?: string;
  eventDateDisplay?: string;
  requestedServices?: string;
  guestEstimate?: number;
  guestEstimateRaw?: string;
  venue?: string;
  budgetRange?: string;
  additionalDetails?: string;
  wantsCallback?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactPhoneNormalized?: string;
  openEnquiryReference?: string;
  upcomingEventTitle?: string;
  upcomingEventDateDisplay?: string;
  upcomingEventStatus?: string;
};

export function identityFromPayload(payload: EnquiryPayload | undefined): {
  contactName?: string;
  contactPhone?: string;
  contactPhoneNormalized?: string;
} {
  if (!payload?.contactName) {
    return {};
  }
  return {
    contactName: payload.contactName,
    contactPhone: payload.contactPhone,
    contactPhoneNormalized: payload.contactPhoneNormalized,
  };
}

export function hasPrefillIdentity(payload: EnquiryPayload): boolean {
  return Boolean(payload.contactName && payload.contactPhoneNormalized);
}
