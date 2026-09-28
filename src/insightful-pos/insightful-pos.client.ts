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

const POS_AUTH_USER_MESSAGE =
  'Shop ops cannot reach the store backend (server authentication failed). Ask your admin to verify INSIGHTFUL_POS_API_KEY matches Supabase WHATSAPP_OPS_API_KEY.';

type ApiResponse = Record<string, unknown>;

function summarizePayload(payload: ApiResponse): string {
  try {
    const text = JSON.stringify(payload);
    return text.length > 240 ? `${text.slice(0, 240)}…` : text;
  } catch {
    return '(unserializable body)';
  }
}

function endpointHost(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return '(invalid INSIGHTFUL_POS_BASE_URL)';
  }
}

function failureFromResponse(
  payload: ApiResponse,
  status: number,
  action: string,
): { userMessage: string; logDetail: string; retryable: boolean } {
  const apiError =
    typeof payload.error === 'string' ? payload.error.trim() : null;
  const platformMessage =
    typeof payload.message === 'string' ? payload.message.trim() : null;

  if (status === 401) {
    if (platformMessage?.toLowerCase().includes('jwt')) {
      return {
        userMessage: POS_AUTH_USER_MESSAGE,
        logDetail:
          'Supabase gateway rejected Bearer token (JWT verification). Deploy whatsapp-ops with --no-verify-jwt.',
        retryable: false,
      };
    }
    if (apiError === 'Unauthorized') {
      return {
        userMessage: POS_AUTH_USER_MESSAGE,
        logDetail:
          'whatsapp-ops returned Unauthorized: WHATSAPP_OPS_API_KEY on Supabase must match INSIGHTFUL_POS_API_KEY on whatsapp3 (redeploy the function after updating secrets).',
        retryable: false,
      };
    }
    return {
      userMessage: POS_AUTH_USER_MESSAGE,
      logDetail: `HTTP 401 from whatsapp-ops; body=${summarizePayload(payload)}`,
      retryable: false,
    };
  }

  const userMessage =
    apiError ?? platformMessage ?? `Insightful POS error (${status})`;
  return {
    userMessage,
    logDetail: `body=${summarizePayload(payload)}`,
    retryable: status >= 500,
  };
}

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
    const action =
      typeof body.action === 'string' ? body.action : 'unknown';
    const baseUrl = this.baseUrl()!;

    if (!this.isConfigured()) {
      throw new InsightfulPosError(
        'Insightful POS API is not configured',
        null,
        false,
        action,
        'Set INSIGHTFUL_POS_BASE_URL and INSIGHTFUL_POS_API_KEY on the bot server.',
      );
    }

    let response: Response;
    try {
      response = await fetch(baseUrl, {
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
      throw new InsightfulPosError(
        'Could not reach Insightful POS',
        null,
        true,
        action,
        `host=${endpointHost(baseUrl)}; network or DNS failure`,
      );
    }

    let payload: ApiResponse;
    try {
      payload = (await response.json()) as ApiResponse;
    } catch {
      throw new InsightfulPosError(
        'Invalid response from Insightful POS',
        response.status,
        response.status >= 500,
        action,
        `host=${endpointHost(baseUrl)}; response was not JSON`,
      );
    }

    if (!response.ok) {
      const failure = failureFromResponse(payload, response.status, action);
      const key = this.apiKey();
      this.logger.error(
        `Insightful POS ${action} failed: status=${response.status}; host=${endpointHost(baseUrl)}; apiKeyConfigured=${Boolean(key)}; apiKeyLength=${key?.length ?? 0}; ${failure.logDetail}`,
      );
      throw new InsightfulPosError(
        failure.userMessage,
        response.status,
        failure.retryable,
        action,
        failure.logDetail,
      );
    }

    return payload;
  }
}
