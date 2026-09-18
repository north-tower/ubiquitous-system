import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DivineBudgetError,
  type DivineBudgetEnquiryInput,
  type DivineBudgetEnquiryResult,
} from './divine-budget.types';

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class DivineBudgetClient {
  private readonly logger = new Logger(DivineBudgetClient.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.baseUrl() && this.apiKey());
  }

  /**
   * Files an enquiry. A timeout after the row was already written is
   * indistinguishable from failure on this side — that's why the API is
   * idempotent on idempotencyKey, and why a retry here cannot create a
   * duplicate in the staff queue.
   */
  async submitEnquiry(
    input: DivineBudgetEnquiryInput,
  ): Promise<DivineBudgetEnquiryResult> {
    if (!this.isConfigured()) {
      throw new DivineBudgetError(
        'Divine Budget API is not configured',
        null,
        false,
      );
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}/api/service/enquiries`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `Divine Budget enquiry request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new DivineBudgetError('Could not reach Divine Budget', null, true);
    }

    const payload = await readJson(response);

    if (response.status === 201) {
      const reference = readString(payload, 'reference');
      const enquiryId = readString(payload, 'enquiryId');
      if (!reference || !enquiryId) {
        throw new DivineBudgetError(
          'Divine Budget returned an incomplete success body',
          201,
          true,
        );
      }
      return { reference, enquiryId };
    }

    const message = readString(payload, 'error') ?? `HTTP ${response.status}`;
    this.logger.error(
      `Divine Budget enquiry rejected status=${response.status} body=${message}`,
    );
    throw new DivineBudgetError(
      message,
      response.status,
      response.status >= 500,
    );
  }

  private baseUrl(): string {
    return (this.config.get<string>('DIVINE_BUDGET_BASE_URL') ?? '').replace(
      /\/$/,
      '',
    );
  }

  private apiKey(): string {
    return this.config.get<string>('DIVINE_BUDGET_API_KEY') ?? '';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown, key: string): string | null {
  if (!isRecord(value) || typeof value[key] !== 'string' || !value[key]) {
    return null;
  }
  return value[key];
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    return null;
  }
}
