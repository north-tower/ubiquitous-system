import { ConfigService } from '@nestjs/config';
import { DivineBudgetClient } from './divine-budget.client';

describe('DivineBudgetClient', () => {
  const env: Record<string, string> = {
    DIVINE_BUDGET_BASE_URL: 'https://divine.example',
    DIVINE_BUDGET_API_KEY: 'test-key',
  };
  const config = {
    get: (key: string) => env[key],
  };
  const client = new DivineBudgetClient(config as unknown as ConfigService);

  const input = {
    contactName: 'Mike',
    contactPhone: '0798229340',
    whatsappPhone: '+254798229340',
    eventType: 'Wedding',
    eventDate: '2026-12-20',
    venue: 'Nakuru',
    guestEstimate: 1000,
    guestEstimateRaw: '400-1000',
    requestedServices: 'Sound & PA',
    wantsCallback: false,
    idempotencyKey: 'conv-1',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the enquiry body with a bearer token', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        jsonResponse(201, { reference: 'REQ-AB12CD', enquiryId: 'enq-1' }),
      );

    await expect(client.submitEnquiry(input)).resolves.toEqual({
      reference: 'REQ-AB12CD',
      enquiryId: 'enq-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://divine.example/api/service/enquiries',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        },
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1];
    expect(request).toBeDefined();
    expect(typeof request?.body).toBe('string');
    const body = JSON.parse(request?.body as string) as {
      idempotencyKey: string;
      guestEstimateRaw: string;
    };
    expect(body.idempotencyKey).toBe('conv-1');
    expect(body.guestEstimateRaw).toBe('400-1000');
  });

  it('treats a 4xx as permanent so the flow does not retry blindly', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse(400, {
        error: 'Please provide a valid Kenyan phone number',
      }),
    );

    await expect(client.submitEnquiry(input)).rejects.toMatchObject({
      name: 'DivineBudgetError',
      retryable: false,
      status: 400,
    });
  });

  it('treats a 5xx as retryable', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        jsonResponse(500, { error: 'Could not submit enquiry' }),
      );

    await expect(client.submitEnquiry(input)).rejects.toMatchObject({
      retryable: true,
      status: 500,
    });
  });

  it('treats a dropped connection as retryable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(client.submitEnquiry(input)).rejects.toMatchObject({
      retryable: true,
      status: null,
    });
  });

  it('strips a trailing slash on the base URL', async () => {
    env.DIVINE_BUDGET_BASE_URL = 'https://divine.example/';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        jsonResponse(201, { reference: 'REQ-AB12CD', enquiryId: 'enq-1' }),
      );

    await new DivineBudgetClient(
      config as unknown as ConfigService,
    ).submitEnquiry(input);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://divine.example/api/service/enquiries',
    );
    env.DIVINE_BUDGET_BASE_URL = 'https://divine.example';
  });

  it('looks up a WhatsApp number without blocking on failure', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        jsonResponse(200, {
          known: true,
          firstName: 'Mike',
          contactName: 'Mike Otieno',
          isCustomer: true,
          openEnquiry: null,
          upcomingEvent: null,
        }),
      );

    await expect(client.lookupContact('+254798229340')).resolves.toEqual({
      known: true,
      firstName: 'Mike',
      contactName: 'Mike Otieno',
      isCustomer: true,
      openEnquiry: null,
      upcomingEvent: null,
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://divine.example/api/service/contacts?phone=%2B254798229340',
    );
  });

  it('treats a lookup outage as unknown so intake still starts', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    await expect(client.lookupContact('+254798229340')).resolves.toBeNull();
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}
