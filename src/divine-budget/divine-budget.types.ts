export type DivineBudgetEnquiryInput = {
  contactName: string;
  contactPhone: string;
  whatsappPhone: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  guestEstimate?: number;
  guestEstimateRaw?: string;
  requestedServices?: string;
  notes?: string;
  budgetRange?: string;
  wantsCallback: boolean;
  idempotencyKey?: string;
};

export type DivineBudgetEnquiryResult = {
  reference: string;
  enquiryId: string;
};

export type DivineBudgetOpenEnquiry = {
  reference: string;
  status: string;
  eventType: string | null;
};

export type DivineBudgetUpcomingEvent = {
  title: string;
  eventDate: string;
  status: string;
};

export type DivineBudgetContact =
  | { known: false }
  | {
      known: true;
      firstName: string | null;
      contactName: string | null;
      isCustomer: boolean;
      openEnquiry: DivineBudgetOpenEnquiry | null;
      upcomingEvent: DivineBudgetUpcomingEvent | null;
    };

/**
 * Distinguishes a caller mistake (4xx — do not retry, it will fail the
 * same way) from a transport/server failure (timeout, 5xx — safe to retry
 * because the API is idempotent on idempotencyKey).
 */
export class DivineBudgetError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'DivineBudgetError';
  }
}
