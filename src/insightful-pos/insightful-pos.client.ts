import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InsightfulPosError,
  type PosAccountPaymentResult,
  type PosCustomerHit,
  type PosProductHit,
  type PosSaleResult,
  type PosStaffIdentity,
} from './insightful-pos.types';

const REQUEST_TIMEOUT_MS = 15_000;

type ApiResponse = Record<string, unknown>;

@Injectable()
export class InsightfulPosClient {
  private readonly logger = new Logger(InsightfulPosClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.baseUrl() && this.apiKey());
  }

  async identify(phone: string): Promise<PosStaffIdentity | null> {
    const data = await this.post({
      action: 'identify',
      phone,
    });
    if (data.authorised === false) {
      return null;
    }
    if (data.authorised !== true) {
      throw new InsightfulPosError('Unexpected identify response', null, false);
    }
    return {
      authorised: true,
      profileId: String(data.profile_id),
      storeId: String(data.store_id),
      staffName: String(data.staff_name ?? ''),
      staffRole: String(data.staff_role ?? ''),
      businessMode: String(data.business_mode ?? ''),
      storeName: String(data.store_name ?? ''),
    };
  }

  async searchProducts(
    phone: string,
    query: string,
  ): Promise<PosProductHit[]> {
    const data = await this.post({ action: 'search_products', phone, query });
    return (data.products as PosProductHit[] | undefined) ?? [];
  }

  async searchCustomers(
    phone: string,
    query: string,
  ): Promise<PosCustomerHit[]> {
    const data = await this.post({ action: 'search_customers', phone, query });
    return (data.customers as PosCustomerHit[] | undefined) ?? [];
  }

  async createSale(input: {
    phone: string;
    idempotencyKey: string;
    saleType: 'cash' | 'credit';
    customerId?: string;
    items: Array<{
      product_id: string;
      product_name: string;
      unit_price: number;
      quantity: number;
    }>;
    payments: Array<{ method: string; amount: number; reference?: string }>;
    notes?: string;
  }): Promise<PosSaleResult> {
    const data = await this.post({
      action: 'create_sale',
      phone: input.phone,
      idempotency_key: input.idempotencyKey,
      sale_type: input.saleType,
      customer_id: input.customerId,
      items: input.items,
      payments: input.payments,
      notes: input.notes,
    });
    const sale = data.sale as PosSaleResult | undefined;
    if (!sale?.order_number) {
      throw new InsightfulPosError('Sale response missing order number', null, false);
    }
    return sale;
  }

  async payAccount(input: {
    phone: string;
    customerId: string;
    amount: number;
    method: string;
    idempotencyKey: string;
    reference?: string;
    notes?: string;
  }): Promise<PosAccountPaymentResult> {
    const data = await this.post({
      action: 'pay_account',
      phone: input.phone,
      customer_id: input.customerId,
      amount: input.amount,
      method: input.method,
      idempotency_key: input.idempotencyKey,
      reference: input.reference,
      notes: input.notes,
    });
    const payment = data.payment as PosAccountPaymentResult | undefined;
    if (!payment?.payment_id) {
      throw new InsightfulPosError(
        'Payment response missing payment_id',
        null,
        false,
      );
    }
    return payment;
  }

  private baseUrl(): string | null {
    const raw = this.config.get<string>('INSIGHTFUL_POS_BASE_URL')?.trim();
    if (!raw) return null;
    return raw.replace(/\/$/, '');
  }

  private apiKey(): string | null {
    return this.config.get<string>('INSIGHTFUL_POS_API_KEY')?.trim() ?? null;
  }

  private async post(body: Record<string, unknown>): Promise<ApiResponse> {
    if (!this.isConfigured()) {
      throw new InsightfulPosError(
        'Insightful POS API is not configured',
        null,
        false,
      );
    }

    let response: Response;
    try {
      response = await fetch(this.baseUrl()!, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `Insightful POS request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InsightfulPosError('Could not reach Insightful POS', null, true);
    }

    let payload: ApiResponse;
    try {
      payload = (await response.json()) as ApiResponse;
    } catch {
      throw new InsightfulPosError(
        'Invalid response from Insightful POS',
        response.status,
        response.status >= 500,
      );
    }

    if (!response.ok) {
      const message =
        typeof payload.error === 'string'
          ? payload.error
          : `Insightful POS error (${response.status})`;
      throw new InsightfulPosError(
        message,
        response.status,
        response.status >= 500,
      );
    }

    return payload;
  }
}
