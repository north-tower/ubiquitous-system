import {
  ForbiddenException,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TechfindIntakeFlowService } from '../techfind-intake/techfind-intake-flow.service';
import { ConversationService } from '../conversation/conversation.service';
import { EnquiryFlowService } from '../enquiry-flow/enquiry-flow.service';
import type {
  EnquiryReply,
  EnquiryTwilioContentKey,
} from '../enquiry-flow/enquiry-twilio-reply';
import { InsightfulPosError } from '../insightful-pos/insightful-pos.types';
import { PosOpsFlowService } from '../pos-ops-flow/pos-ops-flow.service';
import { HmgFlowService } from '../hmg-flow/hmg-flow.service';
import {
  BaileysWhatsappClient,
  type BaileysInboundNotice,
} from '../outbound/baileys-whatsapp.client';
import { previewBaileysText } from '../outbound/baileys-debug';
import { OutboundMessageService } from '../outbound/outbound-message.service';
import type { TelnyxReplyButtonSpec } from '../outbound/telnyx-interactive-button';
import { ConversationStateMachineService } from '../state-machine/conversation-state-machine.service';
import { isHumanHandoffState } from '../state-machine/human-handoff';
import { matchResetCommand } from '../state-machine/match-reset-command';
import { DEFAULT_TENANT_FLOW, type TenantFlow } from '../tenant/tenant-flow';
import { TenantResolverService } from '../tenant/tenant-resolver.service';
import { parseInboundWebhook } from './parse-inbound';
import {
  parseTelnyxWebhook,
  readTelnyxWebhookEventType,
  shouldSilentlyIgnoreTelnyxWebhook,
  summarizeTelnyxWebhook,
} from './parse-telnyx';
import { parseTwilioWebhook } from './parse-twilio';

@Injectable()
export class WhatsappWebhookService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tenantResolver: TenantResolverService,
    private readonly conversations: ConversationService,
    private readonly techfindIntake: TechfindIntakeFlowService,
    private readonly enquiryFlow: EnquiryFlowService,
    private readonly posOpsFlow: PosOpsFlowService,
    private readonly hmgFlow: HmgFlowService,
    private readonly outbound: OutboundMessageService,
    private readonly baileys: BaileysWhatsappClient,
    private readonly stateMachine: ConversationStateMachineService,
  ) {}

  onModuleInit(): void {
    this.baileys.setInboundHandler((message) =>
      this.handleBaileysInbound(message),
    );
  }

  verifySubscription(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string {
    const expected = this.config.getOrThrow<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === expected && challenge) {
      return challenge;
    }
    throw new ForbiddenException('Webhook verification failed');
  }

  async handleInbound(body: unknown): Promise<void> {
    const parsed = parseInboundWebhook(body);

    for (const item of parsed) {
      const tenant = await this.tenantResolver.resolveByWhatsappPhoneNumberId(
        item.metaPhoneNumberId,
      );
      if (!tenant) {
        this.logger.warn(
          `No tenant for whatsapp_phone_number_id=${item.metaPhoneNumberId}`,
        );
        continue;
      }

      await this.processInbound({
        tenantId: tenant.id,
        flow: tenant.flow ?? DEFAULT_TENANT_FLOW,
        phoneNumber: item.phoneNumber,
        text: item.text,
        raw: item.raw,
        channel: 'meta',
      });
    }
  }

  async handleBaileysInbound(input: BaileysInboundNotice): Promise<void> {
    const tenant = await this.tenantResolver.resolveById(input.tenantId);
    if (!tenant) {
      this.logger.warn(
        `No tenant for Baileys inbound tenant=${input.tenantId}`,
      );
      return;
    }

    try {
      await this.processInbound({
        tenantId: tenant.id,
        flow: tenant.flow ?? DEFAULT_TENANT_FLOW,
        phoneNumber: input.phoneNumber,
        text: input.text,
        raw: input.raw,
        channel: 'baileys',
      });
    } catch (error) {
      this.logInboundProcessingFailed('Baileys', error);
    }
  }

  async handleTwilioInbound(body: unknown): Promise<void> {
    const parsed = parseTwilioWebhook(body);
    if (!parsed) {
      this.logger.warn('Twilio webhook had no usable WhatsApp message');
      return;
    }

    const tenant = await this.tenantResolver.resolveForTwilioInbound();
    if (!tenant) {
      this.logger.warn('No tenant for Twilio inbound');
      return;
    }

    try {
      await this.processInbound({
        tenantId: tenant.id,
        flow: tenant.flow ?? DEFAULT_TENANT_FLOW,
        phoneNumber: parsed.phoneNumber,
        text: parsed.text,
        raw: parsed.raw,
        channel: 'twilio',
      });
    } catch (error) {
      this.logInboundProcessingFailed('Twilio', error);
    }
  }

  async handleTelnyxInbound(body: unknown): Promise<void> {
    const eventType = readTelnyxWebhookEventType(body);

    if (shouldSilentlyIgnoreTelnyxWebhook(body)) {
      if (eventType === 'whatsapp.messages') {
        this.logger.log(
          `Telnyx whatsapp.messages skipped (${summarizeTelnyxWebhook(body)})`,
        );
      }
      return;
    }

    switch (eventType) {
      case 'whatsapp.messages':
      case 'message.received':
        break;
      default:
        this.logger.warn(`Unhandled Telnyx event: ${eventType ?? 'unknown'}`);
        return;
    }

    const parsed = parseTelnyxWebhook(body);
    if (!parsed) {
      this.logger.warn(
        `Telnyx webhook had no usable WhatsApp message (${summarizeTelnyxWebhook(body)})`,
      );
      return;
    }

    this.logger.log(
      `Telnyx inbound from=${parsed.phoneNumber} textLen=${parsed.text?.length ?? 0} messageId=${parsed.messageId ?? 'none'}`,
    );

    const tenant = await this.tenantResolver.resolveForTelnyxInbound();
    if (!tenant) {
      this.logger.warn('No tenant for Telnyx inbound');
      return;
    }

    try {
      await this.processInbound({
        tenantId: tenant.id,
        flow: tenant.flow ?? DEFAULT_TENANT_FLOW,
        phoneNumber: parsed.phoneNumber,
        text: parsed.text,
        raw: parsed.raw,
        channel: 'telnyx',
        telnyxFrom: parsed.businessPhoneNumber ?? undefined,
      });
    } catch (error) {
      this.logInboundProcessingFailed('Telnyx', error);
    }
  }

  private logInboundProcessingFailed(channel: string, error: unknown): void {
    if (error instanceof InsightfulPosError) {
      this.logger.error(
        `${channel} inbound processing failed: ${error.describeForLog()}`,
      );
      return;
    }
    this.logger.error(
      `${channel} inbound processing failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  private async processInbound(input: {
    tenantId: string;
    flow: TenantFlow;
    phoneNumber: string;
    text: string | null;
    raw: unknown;
    channel: 'meta' | 'twilio' | 'telnyx' | 'baileys';
    telnyxFrom?: string;
  }): Promise<void> {
    let { conversation } = await this.conversations.recordInbound({
      tenantId: input.tenantId,
      phoneNumber: input.phoneNumber,
      text: input.text,
      raw: input.raw,
    });

    const trimmed = input.text?.trim() ?? '';
    if (isHumanHandoffState(conversation.currentState)) {
      if (!matchResetCommand(trimmed)) {
        return;
      }
      conversation = await this.stateMachine.resumeAutomation(
        conversation.id,
        input.flow,
      );
    }

    let replyText: string;
    let prefaceTexts: string[] | undefined;
    let twilioContent: EnquiryTwilioContentKey | undefined;
    let twilioContentVariables: EnquiryReply['twilioContentVariables'];
    let baileysList: EnquiryReply['baileysList'];
    let telnyxButtons: TelnyxReplyButtonSpec | undefined;
    let silent = false;
    if (input.flow === 'enquiry_intake') {
      const reply = await this.enquiryFlow.handleInbound(
        conversation,
        input.text,
      );
      replyText = reply.replyText;
      prefaceTexts = reply.prefaceTexts;
      twilioContent = reply.twilioContent;
      twilioContentVariables = reply.twilioContentVariables;
      baileysList = reply.baileysList;
      silent = Boolean(reply.silent);
    } else if (input.flow === 'pos_ops') {
      const reply = await this.posOpsFlow.handleInbound(
        conversation,
        input.text,
      );
      replyText = reply.replyText;
      silent = Boolean(reply.silent);
    } else if (input.flow === 'hmg_consultation') {
      const reply = await this.hmgFlow.handleInbound(conversation, input.text);
      replyText = reply.replyText;
      baileysList = reply.baileysList;
      telnyxButtons = reply.telnyxButtons;
      silent = Boolean(reply.silent);
    } else {
      const reply = await this.techfindIntake.handleInbound(
        conversation,
        input.text,
      );
      replyText = reply.replyText;
      silent = Boolean(reply.silent);
    }

    if (input.channel === 'baileys') {
      this.logger.log(
        `Baileys reply plan tenant=${input.tenantId} conversation=${conversation.id} flow=${input.flow} inboundLen=${trimmed.length} silent=${silent} replyLen=${replyText?.length ?? 0} hasList=${Boolean(baileysList)} replyPreview=${previewBaileysText(replyText ?? '')}`,
      );
    }

    if (silent || !replyText) {
      if (input.channel === 'baileys') {
        this.logger.warn(
          `Baileys outbound skipped tenant=${input.tenantId} conversation=${conversation.id} silent=${silent} replyEmpty=${!replyText}`,
        );
      }
      return;
    }

    const telnyxJobFields =
      input.channel === 'telnyx' && input.telnyxFrom
        ? { telnyxFrom: input.telnyxFrom }
        : {};

    const outboundJobs = [
      ...(prefaceTexts ?? []).map((text) => ({
        conversationId: conversation.id,
        to: input.phoneNumber,
        text,
        channel: input.channel,
        tenantId: input.tenantId,
        ...telnyxJobFields,
      })),
      {
        conversationId: conversation.id,
        to: input.phoneNumber,
        text: replyText,
        channel: input.channel,
        tenantId: input.tenantId,
        ...telnyxJobFields,
        ...(twilioContent ? { twilioContent, twilioContentVariables } : {}),
        ...(baileysList ? { baileysList } : {}),
        ...(telnyxButtons ? { telnyxButtons } : {}),
      },
    ];
    await this.outbound.sendAll(outboundJobs);
  }
}
