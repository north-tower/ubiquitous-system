import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DivineBudgetError,
  type DivineBudgetContact,
  type DivineBudgetEnquiryInput,
  type DivineBudgetEnquiryResult,
  type DivineBudgetOpenEnquiry,
  type DivineBudgetUpcomingEvent,
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

  /**
   * Read-only card for a WhatsApp number. Fail-open: a lookup error must
   * not block intake — the bot greets them as new instead.
   */
  async lookupContact(phone: string): Promise<DivineBudgetContact | null> {
    if (!this.isConfigured()) {
      return null;
    }

    let response: Response;
    try {
      const url = `${this.baseUrl()}/api/service/contacts?phone=${encodeURIComponent(phone)}`;
      response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey()}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(
        `Divine Budget contact lookup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }

    if (response.status !== 200) {
      this.logger.warn(
        `Divine Budget contact lookup status=${response.status}`,
      );
      return null;
    }

    return parseContact(await readJson(response));
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

function parseContact(value: unknown): DivineBudgetContact | null {
  if (!isRecord(value) || typeof value.known !== 'boolean') {
    return null;
  }
  if (!value.known) {
    return { known: false };
  }

  return {
    known: true,
    firstName: optionalString(value.firstName),
    contactName: optionalString(value.contactName),
    isCustomer: value.isCustomer === true,
    openEnquiry: parseOpenEnquiry(value.openEnquiry),
    upcomingEvent: parseUpcomingEvent(value.upcomingEvent),
  };
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function parseOpenEnquiry(value: unknown): DivineBudgetOpenEnquiry | null {
  if (!isRecord(value)) {
    return null;
  }
  const reference = readString(value, 'reference');
  const status = readString(value, 'status');
  if (!reference || !status) {
    return null;
  }
  const eventType = value.eventType;
  return {
    reference,
    status,
    eventType: typeof eventType === 'string' ? eventType : null,
  };
}

function parseUpcomingEvent(value: unknown): DivineBudgetUpcomingEvent | null {
  if (!isRecord(value)) {
    return null;
  }
  const title = readString(value, 'title');
  const eventDate = readString(value, 'eventDate');
  const status = readString(value, 'status');
  if (!title || !eventDate || !status) {
    return null;
  }
  return { title, eventDate, status };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    return null;
  }
}
