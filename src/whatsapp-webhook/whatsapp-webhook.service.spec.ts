import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOrchestratorService } from '../ai-orchestrator/ai-orchestrator.service';
import { ConversationService } from '../conversation/conversation.service';
import { EnquiryFlowService } from '../enquiry-flow/enquiry-flow.service';
import { OutboundMessageService } from '../outbound/outbound-message.service';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { TenantResolverService } from '../tenant/tenant-resolver.service';
import { SAMPLE_META_TEXT_WEBHOOK } from './sample-meta-webhook';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

describe('WhatsappWebhookService', () => {
  const tenantResolver = {
    resolveByWhatsappPhoneNumberId: jest.fn(),
    resolveDefault: jest.fn(),
  };
  const conversations = {
    recordInbound: jest.fn(),
  };
  const orchestrator = {
    handleInboundMessage: jest.fn(),
  };
  const enquiryFlow = {
    handleInbound: jest.fn(),
  };
  const outbound = {
    sendAll: jest.fn(),
  };
  const env: Record<string, string> = {
    META_VERIFY_TOKEN: 'verify-me',
  };
  const config = {
    getOrThrow: (key: string) => env[key],
  };

  function createService(): WhatsappWebhookService {
    return new WhatsappWebhookService(
      config as unknown as ConfigService,
      tenantResolver as unknown as TenantResolverService,
      conversations as unknown as ConversationService,
      orchestrator as unknown as AiOrchestratorService,
      enquiryFlow as unknown as EnquiryFlowService,
      outbound as unknown as OutboundMessageService,
    );
  }

  beforeEach(() => {
    tenantResolver.resolveByWhatsappPhoneNumberId.mockReset();
    tenantResolver.resolveDefault.mockReset();
    conversations.recordInbound.mockReset();
    orchestrator.handleInboundMessage.mockReset();
    enquiryFlow.handleInbound.mockReset();
    outbound.sendAll.mockReset();
    conversations.recordInbound.mockResolvedValue({
      conversation: { id: 'conv-1', currentState: ConversationState.NEW },
      message: { id: 'msg-1' },
    });
    orchestrator.handleInboundMessage.mockResolvedValue({
      conversation: { id: 'conv-1' },
      replyText: 'hello back',
    });
    enquiryFlow.handleInbound.mockResolvedValue({
      replyText: 'what are you planning?',
    });
    outbound.sendAll.mockResolvedValue(undefined);
  });

  it('returns the hub challenge when the verify token matches', () => {
    expect(
      createService().verifySubscription('subscribe', 'verify-me', 'c-99'),
    ).toBe('c-99');
  });

  it('rejects a bad verify token', () => {
    expect(() =>
      createService().verifySubscription('subscribe', 'wrong', 'c-99'),
    ).toThrow(ForbiddenException);
  });

  it('persists inbound mail and sends the engine replies', async () => {
    tenantResolver.resolveByWhatsappPhoneNumberId.mockResolvedValue({
      id: 'tenant-1',
    });

    await createService().handleInbound(SAMPLE_META_TEXT_WEBHOOK);

    expect(conversations.recordInbound).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      phoneNumber: '254711111111',
      text: 'hello',
      raw: SAMPLE_META_TEXT_WEBHOOK.entry[0].changes[0].value.messages[0],
    });
    expect(orchestrator.handleInboundMessage).toHaveBeenCalledWith(
      'conv-1',
      'hello',
    );
    expect(enquiryFlow.handleInbound).not.toHaveBeenCalled();
    expect(outbound.sendAll).toHaveBeenCalledWith([
      {
        conversationId: 'conv-1',
        to: '254711111111',
        text: 'hello back',
        channel: 'meta',
      },
    ]);
  });

  it('replies on Twilio when inbound arrived via Twilio', async () => {
    tenantResolver.resolveDefault.mockResolvedValue({ id: 'tenant-1' });

    const twilioBody = {
      SmsStatus: 'received',
      Body: 'hello',
      From: 'whatsapp:+254711111111',
      WaId: '254711111111',
      MessageSid: 'SM123',
    };

    await createService().handleTwilioInbound(twilioBody);

    expect(conversations.recordInbound).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      phoneNumber: '254711111111',
      text: 'hello',
      raw: twilioBody,
    });
    expect(outbound.sendAll).toHaveBeenCalledWith([
      {
        conversationId: 'conv-1',
        to: '254711111111',
        text: 'hello back',
        channel: 'twilio',
      },
    ]);
  });

  it('does not throw when Twilio orchestrator processing fails', async () => {
    tenantResolver.resolveDefault.mockResolvedValue({ id: 'tenant-1' });
    orchestrator.handleInboundMessage.mockRejectedValue(new Error('boom'));

    await expect(
      createService().handleTwilioInbound({
        Body: 'mauanul',
        From: 'whatsapp:+254711111111',
        WaId: '254711111111',
        MessageSid: 'SM123',
      }),
    ).resolves.toBeUndefined();
  });

  it('does not persist when the tenant is unknown', async () => {
    tenantResolver.resolveByWhatsappPhoneNumberId.mockResolvedValue(null);

    await createService().handleInbound(SAMPLE_META_TEXT_WEBHOOK);

    expect(conversations.recordInbound).not.toHaveBeenCalled();
    expect(outbound.sendAll).not.toHaveBeenCalled();
  });

  it('routes an enquiry_intake tenant to the enquiry flow, not the Techfind orchestrator', async () => {
    const conversation = {
      id: 'conv-1',
      prospectPhone: '254798229340',
      currentState: ConversationState.NEW,
    };
    tenantResolver.resolveDefault.mockResolvedValue({
      id: 'tenant-1',
      flow: 'enquiry_intake',
    });
    conversations.recordInbound.mockResolvedValue({
      conversation,
      message: { id: 'msg-1' },
    });

    await createService().handleTwilioInbound({
      SmsStatus: 'received',
      Body: 'hi',
      From: 'whatsapp:+254798229340',
      WaId: '254798229340',
      MessageSid: 'SM123',
    });

    expect(enquiryFlow.handleInbound).toHaveBeenCalledWith(conversation, 'hi');
    expect(orchestrator.handleInboundMessage).not.toHaveBeenCalled();
    expect(outbound.sendAll).toHaveBeenCalledWith([
      expect.objectContaining({
        text: 'what are you planning?',
        channel: 'twilio',
      }),
    ]);
  });
});
