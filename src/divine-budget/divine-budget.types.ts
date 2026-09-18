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
  wantsCallback: boolean;
  idempotencyKey?: string;
};

export type DivineBudgetEnquiryResult = {
  reference: string;
  enquiryId: string;
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
