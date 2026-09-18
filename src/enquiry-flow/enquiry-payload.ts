export type EnquiryPayload = {
  eventType?: string;
  eventDate?: string;
  eventDateDisplay?: string;
  requestedServices?: string;
  guestEstimate?: number;
  guestEstimateRaw?: string;
  venue?: string;
  wantsCallback?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactPhoneNormalized?: string;
};
