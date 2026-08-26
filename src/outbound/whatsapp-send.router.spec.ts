import { ConfigService } from '@nestjs/config';
import { MetaWhatsappClient } from './meta-whatsapp.client';
import { TwilioWhatsappClient } from './twilio-whatsapp.client';
import { WhatsappSendRouter } from './whatsapp-send.router';

describe('WhatsappSendRouter', () => {
  const meta = {
    channel: 'meta' as const,
    isConfigured: jest.fn(),
    sendText: jest.fn(),
  };
  const twilio = {
    channel: 'twilio' as const,
    isConfigured: jest.fn(),
    sendText: jest.fn(),
  };
  const env: Record<string, string | undefined> = {};
  const config = {
    get: (key: string) => env[key],
  };

  function createRouter(): WhatsappSendRouter {
    return new WhatsappSendRouter(
      config as unknown as ConfigService,
      meta as unknown as MetaWhatsappClient,
      twilio as unknown as TwilioWhatsappClient,
    );
  }

  beforeEach(() => {
    meta.isConfigured.mockReset();
    meta.sendText.mockReset();
    twilio.isConfigured.mockReset();
    twilio.sendText.mockReset();
    env.WHATSAPP_SEND_FAILOVER = undefined;
    env.WHATSAPP_PRIMARY_CHANNEL = undefined;
    meta.isConfigured.mockReturnValue(true);
    twilio.isConfigured.mockReturnValue(true);
    meta.sendText.mockResolvedValue({ messageId: 'wamid.1', raw: {} });
    twilio.sendText.mockResolvedValue({ messageId: 'SM1', raw: {} });
  });

  it('uses Twilio first when no inbound channel is specified', async () => {
    await expect(
      createRouter().sendText('254711111111', 'hi'),
    ).resolves.toEqual({
      channel: 'twilio',
      messageId: 'SM1',
      raw: {},
    });
    expect(twilio.sendText).toHaveBeenCalled();
    expect(meta.sendText).not.toHaveBeenCalled();
  });

  it('uses Meta first when WHATSAPP_PRIMARY_CHANNEL=meta', async () => {
    env.WHATSAPP_PRIMARY_CHANNEL = 'meta';

    await expect(
      createRouter().sendText('254711111111', 'hi'),
    ).resolves.toEqual({
      channel: 'meta',
      messageId: 'wamid.1',
      raw: {},
    });
    expect(meta.sendText).toHaveBeenCalled();
    expect(twilio.sendText).not.toHaveBeenCalled();
  });

  it('sends on the preferred channel when it is configured', async () => {
    await expect(
      createRouter().sendText('254711111111', 'hi', 'twilio'),
    ).resolves.toEqual({
      channel: 'twilio',
      messageId: 'SM1',
      raw: {},
    });
    expect(twilio.sendText).toHaveBeenCalledWith('254711111111', 'hi');
    expect(meta.sendText).not.toHaveBeenCalled();
  });

  it('does not fail over when WHATSAPP_SEND_FAILOVER is unset', async () => {
    twilio.sendText.mockRejectedValue(new Error('twilio down'));

    await expect(
      createRouter().sendText('254711111111', 'hi', 'twilio'),
    ).rejects.toThrow('twilio down');
    expect(meta.sendText).not.toHaveBeenCalled();
  });

  it('fails over to the other configured provider when enabled', async () => {
    env.WHATSAPP_SEND_FAILOVER = 'true';
    twilio.sendText.mockRejectedValue(new Error('twilio down'));

    await expect(
      createRouter().sendText('254711111111', 'hi', 'twilio'),
    ).resolves.toEqual({
      channel: 'meta',
      messageId: 'wamid.1',
      raw: {},
    });
    expect(meta.sendText).toHaveBeenCalled();
  });

  it('throws when the preferred provider is missing and failover is off', async () => {
    twilio.isConfigured.mockReturnValue(false);

    await expect(
      createRouter().sendText('254711111111', 'hi', 'twilio'),
    ).rejects.toThrow('WhatsApp provider "twilio" is not configured');
    expect(meta.sendText).not.toHaveBeenCalled();
  });

  it('throws when no provider is configured', async () => {
    meta.isConfigured.mockReturnValue(false);
    twilio.isConfigured.mockReturnValue(false);

    await expect(createRouter().sendText('254711111111', 'hi')).rejects.toThrow(
      'No WhatsApp provider is configured',
    );
  });
});
