import { ConfigService } from '@nestjs/config';
import { ConversationService } from '../conversation/conversation.service';
import { TenantService } from '../tenant/tenant.service';
import { OutboundMessageService } from './outbound-message.service';
import { TwilioSendError } from './twilio-whatsapp.client';
import { WhatsappSendRouter } from './whatsapp-send.router';

describe('OutboundMessageService enquiry Twilio content', () => {
  const config = { get: jest.fn() };
  const router = {
    sendContent: jest.fn(),
    sendText: jest.fn(),
  };
  const conversations = { recordOutbound: jest.fn() };
  const tenants = { findById: jest.fn() };

  beforeEach(() => {
    config.get.mockReset();
    router.sendContent.mockReset();
    router.sendText.mockReset();
    conversations.recordOutbound.mockReset();
    config.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'development';
      }
      if (key === 'TWILIO_EVENT_TYPE_CONTENT_SID') {
        return 'HXevent';
      }
      return undefined;
    });
    router.sendContent.mockResolvedValue({
      channel: 'twilio',
      messageId: 'SM2',
      raw: {},
    });
    router.sendText.mockResolvedValue({
      channel: 'twilio',
      messageId: 'SM1',
      raw: {},
    });
  });

  function createService(): OutboundMessageService {
    return new OutboundMessageService(
      config as unknown as ConfigService,
      router as unknown as WhatsappSendRouter,
      conversations as unknown as ConversationService,
      tenants as unknown as TenantService,
    );
  }

  it('sends Twilio content on the twilio channel when SID is configured', async () => {
    await createService().sendText({
      conversationId: 'c1',
      to: '254711111111',
      text: 'What are you planning?',
      channel: 'twilio',
      twilioContent: 'eventType',
    });

    expect(router.sendContent).toHaveBeenCalledWith(
      '254711111111',
      'HXevent',
      undefined,
    );
    expect(router.sendText).not.toHaveBeenCalled();
  });

  it('passes content variables for confirm templates', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'development';
      }
      if (key === 'TWILIO_ENQUIRY_CONFIRM_CONTENT_SID') {
        return 'HXconfirm';
      }
      return undefined;
    });

    await createService().sendText({
      conversationId: 'c1',
      to: '254711111111',
      text: 'summary fallback',
      channel: 'twilio',
      twilioContent: 'confirm',
      twilioContentVariables: { '1': 'Event: Wedding' },
    });

    expect(router.sendContent).toHaveBeenCalledWith('254711111111', 'HXconfirm', {
      '1': 'Event: Wedding',
    });
  });

  it('sends the services Flow template when Flow SID is configured', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'development';
      }
      if (key === 'TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID') {
        return 'HXflow';
      }
      return undefined;
    });

    await createService().sendText({
      conversationId: 'c1',
      to: '254711111111',
      text: 'What would you like us to handle?',
      channel: 'twilio',
      twilioContent: 'services',
    });

    expect(router.sendContent).toHaveBeenCalledWith(
      '254711111111',
      'HXflow',
      undefined,
    );
  });

  it('retries services Flow content with flow_token after Twilio 21656 and no vars', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'development';
      }
      if (key === 'TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID') {
        return 'HXflow';
      }
      return undefined;
    });
    router.sendContent
      .mockRejectedValueOnce(
        new TwilioSendError(
          400,
          JSON.stringify({
            code: 21656,
            message: 'The Content Variables parameter is invalid.',
          }),
        ),
      )
      .mockResolvedValueOnce({
        channel: 'twilio',
        messageId: 'SM4',
        raw: {},
      });

    await createService().sendText({
      conversationId: 'c1',
      to: '254711111111',
      text: 'What would you like us to handle?',
      channel: 'twilio',
      twilioContent: 'services',
    });

    expect(router.sendContent).toHaveBeenNthCalledWith(
      1,
      '254711111111',
      'HXflow',
      undefined,
    );
    expect(router.sendContent).toHaveBeenNthCalledWith(
      2,
      '254711111111',
      'HXflow',
      expect.objectContaining({
        '1': expect.stringMatching(/^[0-9a-f-]{36}$/i),
      }),
    );
    expect(router.sendText).not.toHaveBeenCalled();
  });

  it('retries services list content without variables after Twilio 21656', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'development';
      }
      if (key === 'TWILIO_ENQUIRY_SERVICES_CONTENT_SID') {
        return 'HXlist';
      }
      return undefined;
    });
    router.sendContent
      .mockRejectedValueOnce(
        new TwilioSendError(
          400,
          JSON.stringify({
            code: 21656,
            message: 'The Content Variables parameter is invalid.',
          }),
        ),
      )
      .mockResolvedValueOnce({
        channel: 'twilio',
        messageId: 'SM3',
        raw: {},
      });

    await createService().sendText({
      conversationId: 'c1',
      to: '254711111111',
      text: 'What would you like us to handle?',
      channel: 'twilio',
      twilioContent: 'services',
      twilioContentVariables: { '1': 'What would you like us to handle?' },
    });

    expect(router.sendContent).toHaveBeenNthCalledWith(1, '254711111111', 'HXlist', {
      '1': 'What would you like us to handle?',
    });
    expect(router.sendContent).toHaveBeenNthCalledWith(
      2,
      '254711111111',
      'HXlist',
      undefined,
    );
    expect(router.sendText).not.toHaveBeenCalled();
  });

  it('falls back to text on baileys even when twilioContent is set', async () => {
    await createService().sendText({
      conversationId: 'c1',
      to: '254711111111',
      text: 'numbered list',
      channel: 'baileys',
      twilioContent: 'eventType',
    });

    expect(router.sendContent).not.toHaveBeenCalled();
    expect(router.sendText).toHaveBeenCalled();
  });
});
