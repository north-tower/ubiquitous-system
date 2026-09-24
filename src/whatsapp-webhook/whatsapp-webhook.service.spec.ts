import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOrchestratorService } from '../ai-orchestrator/ai-orchestrator.service';
import { ConversationService } from '../conversation/conversation.service';
import { EnquiryFlowService } from '../enquiry-flow/enquiry-flow.service';
import { BaileysWhatsappClient } from '../outbound/baileys-whatsapp.client';
import { OutboundMessageService } from '../outbound/outbound-message.service';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { TenantResolverService } from '../tenant/tenant-resolver.service';
import { SAMPLE_META_TEXT_WEBHOOK } from './sample-meta-webhook';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

describe('WhatsappWebhookService', () => {
  const tenantResolver = {
    resolveByWhatsappPhoneNumberId: jest.fn(),
    resolveDefault: jest.fn(),
    resolveById: jest.fn(),
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
  const baileys = {
    setInboundHandler: jest.fn(),
  };
  const stateMachine = {
    resumeAutomation: jest.fn(),
    enterHumanHandoff: jest.fn(),
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
      baileys as unknown as BaileysWhatsappClient,
      stateMachine as never,
    );
  }

  beforeEach(() => {
    tenantResolver.resolveByWhatsappPhoneNumberId.mockReset();
    tenantResolver.resolveDefault.mockReset();
    tenantResolver.resolveById.mockReset();
    conversations.recordInbound.mockReset();
    orchestrator.handleInboundMessage.mockReset();
    enquiryFlow.handleInbound.mockReset();
    outbound.sendAll.mockReset();
    baileys.setInboundHandler.mockReset();
    stateMachine.resumeAutomation.mockReset();
    stateMachine.enterHumanHandoff.mockReset();
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
        tenantId: 'tenant-1',
      },
    ]);
  });

  it('registers the Baileys inbound handler on init', () => {
    const service = createService();
    service.onModuleInit();
    expect(baileys.setInboundHandler).toHaveBeenCalledTimes(1);
  });

  it('replies on Baileys for the tenant that owns the socket', async () => {
    tenantResolver.resolveById.mockResolvedValue({ id: 'tenant-9' });

    await createService().handleBaileysInbound({
      tenantId: 'tenant-9',
      phoneNumber: '254711111111',
      text: 'hello',
      raw: { key: { remoteJid: '254711111111@s.whatsapp.net' } },
    });

    expect(tenantResolver.resolveDefault).not.toHaveBeenCalled();
    expect(conversations.recordInbound).toHaveBeenCalledWith({
      tenantId: 'tenant-9',
      phoneNumber: '254711111111',
      text: 'hello',
      raw: { key: { remoteJid: '254711111111@s.whatsapp.net' } },
    });
    expect(outbound.sendAll).toHaveBeenCalledWith([
      {
        conversationId: 'conv-1',
        to: '254711111111',
        text: 'hello back',
        channel: 'baileys',
        tenantId: 'tenant-9',
      },
    ]);
  });

  it('does not persist a Baileys message when that tenant is missing', async () => {
    tenantResolver.resolveById.mockResolvedValue(null);

    await createService().handleBaileysInbound({
      tenantId: 'missing',
      phoneNumber: '254711111111',
      text: 'hello',
      raw: {},
    });

    expect(conversations.recordInbound).not.toHaveBeenCalled();
    expect(outbound.sendAll).not.toHaveBeenCalled();
  });

  it('runs the enquiry flow for the Baileys tenant that owns the number', async () => {
    tenantResolver.resolveById.mockResolvedValue({
      id: 'tenant-enquiry',
      flow: 'enquiry_intake',
    });

    await createService().handleBaileysInbound({
      tenantId: 'tenant-enquiry',
      phoneNumber: '254798229340',
      text: 'hi',
      raw: {},
    });

    expect(enquiryFlow.handleInbound).toHaveBeenCalled();
    expect(orchestrator.handleInboundMessage).not.toHaveBeenCalled();
    expect(outbound.sendAll).toHaveBeenCalledWith([
      expect.objectContaining({
        channel: 'baileys',
        tenantId: 'tenant-enquiry',
        text: 'what are you planning?',
      }),
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
        tenantId: 'tenant-1',
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

  it('forwards an event-type list on the Twilio reply', async () => {
    tenantResolver.resolveDefault.mockResolvedValue({
      id: 'tenant-1',
      flow: 'enquiry_intake',
    });
    enquiryFlow.handleInbound.mockResolvedValue({
      replyText: 'what are you planning?',
      list: 'event_type',
    });

    await createService().handleTwilioInbound({
      SmsStatus: 'received',
      Body: 'hi',
      From: 'whatsapp:+254798229340',
      WaId: '254798229340',
      MessageSid: 'SM123',
    });

    expect(outbound.sendAll).toHaveBeenCalledWith([
      expect.objectContaining({
        text: 'what are you planning?',
        channel: 'twilio',
        list: 'event_type',
      }),
    ]);
  });

  it('does not run the flow or reply when the chat is in human handoff', async () => {
    tenantResolver.resolveByWhatsappPhoneNumberId.mockResolvedValue({
      id: 'tenant-1',
      flow: 'techfind_demo',
    });
    conversations.recordInbound.mockResolvedValue({
      conversation: {
        id: 'conv-1',
        currentState: ConversationState.HUMAN_HANDOFF,
      },
      message: { id: 'msg-1' },
    });

    await createService().handleInbound(SAMPLE_META_TEXT_WEBHOOK);

    expect(orchestrator.handleInboundMessage).not.toHaveBeenCalled();
    expect(enquiryFlow.handleInbound).not.toHaveBeenCalled();
    expect(outbound.sendAll).not.toHaveBeenCalled();
  });

  it('resumes automation on reset while in human handoff', async () => {
    tenantResolver.resolveByWhatsappPhoneNumberId.mockResolvedValue({
      id: 'tenant-1',
      flow: 'techfind_demo',
    });
    conversations.recordInbound.mockResolvedValue({
      conversation: {
        id: 'conv-1',
        currentState: ConversationState.HUMAN_HANDOFF,
      },
      message: { id: 'msg-1' },
    });
    stateMachine.resumeAutomation.mockResolvedValue({
      id: 'conv-1',
      currentState: ConversationState.TECHFIND_GREETING,
    });

    await createService().handleInbound({
      ...SAMPLE_META_TEXT_WEBHOOK,
      entry: [
        {
          ...SAMPLE_META_TEXT_WEBHOOK.entry[0],
          changes: [
            {
              ...SAMPLE_META_TEXT_WEBHOOK.entry[0].changes[0],
              value: {
                ...SAMPLE_META_TEXT_WEBHOOK.entry[0].changes[0].value,
                messages: [
                  {
                    ...SAMPLE_META_TEXT_WEBHOOK.entry[0].changes[0].value
                      .messages[0],
                    text: { body: 'reset' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(stateMachine.resumeAutomation).toHaveBeenCalledWith(
      'conv-1',
      'techfind_demo',
    );
    expect(orchestrator.handleInboundMessage).toHaveBeenCalledWith(
      'conv-1',
      'reset',
    );
  });
});
