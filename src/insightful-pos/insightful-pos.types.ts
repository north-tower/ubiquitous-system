export type PosStaffIdentity = {
  authorised: true;
  profileId: string;
  storeId: string;
  staffName: string;
  staffRole: string;
  businessMode: string;
  storeName: string;
};

export type PosProductHit = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  sku: string | null;
};

export type PosCustomerHit = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  credit_balance: number;
  credit_limit: number;
};

export type PosSaleResult = {
  order_id: string;
  order_number: string;
  invoice_number: string;
  total: number;
  store_id: string;
};

export type PosAccountPaymentResult = {
  payment_id: string;
  balance_before: number;
  applied_amount: number;
  balance_after: number;
};

export class InsightfulPosError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null,
    readonly retryable: boolean,
    readonly action?: string,
    readonly logDetail?: string,
  ) {
    super(message);
    this.name = 'InsightfulPosError';
  }

  /** Safe for server logs — never includes API keys or response secrets. */
  describeForLog(): string {
    const parts = [this.message];
    if (this.action) {
      parts.push(`action=${this.action}`);
    }
    if (this.statusCode != null) {
      parts.push(`status=${this.statusCode}`);
    }
    if (this.logDetail) {
      parts.push(this.logDetail);
    }
    return parts.join('; ');
  }
}
