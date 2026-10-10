import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnquiryTwilioContentKey } from '../enquiry-flow/enquiry-twilio-reply';
import { ConversationService } from '../conversation/conversation.service';
import { TenantService } from '../tenant/tenant.service';
import {
  createServicesFlowTokenVariables,
  resolveEnquiryTwilioContentForSend,
} from './resolve-enquiry-twilio-content-send';
import {
  isTwilioContentSendDebug,
  maskContentSid,
  previewContentVariables,
  summarizeContentVariables,
} from './twilio-content-send-debug';
import {
  TwilioSendError,
  twilioSendErrorCode,
} from './twilio-whatsapp.client';
import { type WhatsappChannel } from './whatsapp-channel';
import { WhatsappSendRouter } from './whatsapp-send.router';

export type OutboundTextJob = {
  conversationId: string;
  to: string;
  text: string;
  channel?: WhatsappChannel;
  /** Baileys replies go out on the socket that received the inbound message. */
  tenantId?: string;
  /** Twilio Content template for enquiry_intake (Twilio channel only). */
  twilioContent?: EnquiryTwilioContentKey;
  twilioContentVariables?: Record<string, string>;
};

@Injectable()
export class OutboundMessageService {
  private readonly logger = new Logger(OutboundMessageService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly router: WhatsappSendRouter,
    private readonly conversations: ConversationService,
    private readonly tenants: TenantService,
  ) {}

  async sendText(job: OutboundTextJob): Promise<void> {
    if (
      this.config.get<string>('NODE_ENV') === 'test' ||
      this.config.get<string>('META_SKIP_SEND') === 'true' ||
      this.config.get<string>('WHATSAPP_SKIP_SEND') === 'true'
    ) {
      await this.conversations.recordOutbound({
        conversationId: job.conversationId,
        text: job.text,
        rawPayload: {
          skipped: true,
          channel: job.channel ?? null,
          twilioContent: job.twilioContent ?? null,
        },
      });
      this.logger.warn(
        `Skipped WhatsApp send (test/skip) conversation=${job.conversationId} channel=${job.channel ?? 'auto'}`,
      );
      return;
    }
    const contentSend = this.resolveTwilioContentSend(job);
    if (contentSend) {
      const varSummary = summarizeContentVariables(contentSend.contentVariables);
      this.logger.log(
        `Twilio content attempt conversation=${job.conversationId} template=${job.twilioContent} sid=${maskContentSid(contentSend.contentSid)} sidSource=${contentSend.trace.sidSource} sidEnv=${contentSend.trace.sidEnvVar} flowSidConfigured=${contentSend.trace.servicesFlowSidConfigured} listSidConfigured=${contentSend.trace.servicesListSidConfigured} sendFlowToken=${contentSend.trace.sendFlowTokenEnabled} outboundVarCount=${varSummary.count} inboundVarKeys=${contentSend.trace.inboundVariableKeys.join(',') || 'none'}`,
      );
      if (
        job.twilioContent === 'services' &&
        contentSend.trace.sidSource === 'services_list'
      ) {
        this.logger.warn(
          `Services step is not using the Flow template: set TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID in the API environment (docker .env) and restart. Currently sending list SID ${maskContentSid(contentSend.contentSid)} with ContentVariables — if the list template has no {{1}}, Twilio returns 21656.`,
        );
      }
      if (isTwilioContentSendDebug(this.config)) {
        this.logger.debug(
          `Twilio content trace conversation=${job.conversationId} ${JSON.stringify(contentSend.trace)} preview=${JSON.stringify(previewContentVariables(contentSend.contentVariables))} jobPreview=${JSON.stringify(previewContentVariables(job.twilioContentVariables))}`,
        );
      }
      try {
        const sent = await this.sendTwilioContentWithServices21656Retry(
          job,
          contentSend,
        );
        await this.conversations.recordOutbound({
          conversationId: job.conversationId,
          text: job.text,
          rawPayload: {
            channel: sent.channel,
            messageId: sent.messageId,
            contentSid: contentSend.contentSid,
            contentVariables: sent.contentVariables ?? null,
            response: sent.raw,
          },
        });
        this.logger.log(
          `Sent WhatsApp content conversation=${job.conversationId} to=${job.to} channel=${sent.channel} template=${job.twilioContent}`,
        );
        return;
      } catch (error) {
        const twilioRequest =
          error instanceof TwilioSendError ? error.contentRequest : undefined;
        this.logger.error(
          `WhatsApp content send failed, falling back to text conversation=${job.conversationId} template=${job.twilioContent ?? 'none'} sid=${maskContentSid(contentSend.contentSid)} trace=${JSON.stringify(contentSend.trace)} twilioRequest=${twilioRequest ? JSON.stringify({ ...twilioRequest, contentSid: maskContentSid(twilioRequest.contentSid) }) : 'n/a'}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const channel = await this.resolveSendChannel(job);
    const { channel: usedChannel, messageId, raw } = await this.router.sendText(
      job.to,
      job.text,
      channel,
      job.tenantId,
    );
    await this.conversations.recordOutbound({
      conversationId: job.conversationId,
      text: job.text,
      rawPayload: { channel: usedChannel, messageId, response: raw },
    });
    this.logger.log(
      `Sent WhatsApp text conversation=${job.conversationId} to=${job.to} channel=${usedChannel}`,
    );
  }

  /**
   * Twilio 21656: variable count/value mismatch. Retry once with the opposite shape
   * for services list (strip {{1}}) or Flow (add flow_token {{1}}).
   */
  private async sendTwilioContentWithServices21656Retry(
    job: OutboundTextJob,
    contentSend: NonNullable<ReturnType<OutboundMessageService['resolveTwilioContentSend']>>,
  ): Promise<{
    channel: Awaited<ReturnType<WhatsappSendRouter['sendContent']>>['channel'];
    messageId: string | null;
    raw: unknown;
    contentVariables?: Record<string, string>;
  }> {
    const trySend = (contentVariables?: Record<string, string>) =>
      this.router.sendContent(job.to, contentSend.contentSid, contentVariables);

    try {
      const result = await trySend(contentSend.contentVariables);
      return { ...result, contentVariables: contentSend.contentVariables };
    } catch (error) {
      const hadVariables =
        summarizeContentVariables(contentSend.contentVariables).count > 0;
      const isInvalidVariables = twilioSendErrorCode(error) === 21656;
      if (job.twilioContent !== 'services' || !isInvalidVariables) {
        throw error;
      }
      if (
        contentSend.trace.sidSource === 'services_list' &&
        hadVariables
      ) {
        this.logger.warn(
          `Twilio 21656 on services list template ${maskContentSid(contentSend.contentSid)} — retrying without ContentVariables (static list body). Set TWILIO_ENQUIRY_SERVICES_FLOW_CONTENT_SID for multi-select Flow, or TWILIO_ENQUIRY_SERVICES_LIST_SEND_BODY_VARIABLE=false to skip {{1}} on first attempt.`,
        );
        const result = await trySend(undefined);
        return { ...result, contentVariables: undefined };
      }
      if (
        contentSend.trace.sidSource === 'services_flow' &&
        !hadVariables
      ) {
        const flowVars = createServicesFlowTokenVariables();
        this.logger.warn(
          `Twilio 21656 on services Flow template ${maskContentSid(contentSend.contentSid)} with no ContentVariables — retrying with flow_token variable {{1}}. Set TWILIO_ENQUIRY_SERVICES_FLOW_SEND_FLOW_TOKEN=true to send a token on the first attempt. If this still fails, submit the template for WhatsApp approval and confirm the HX SID belongs to the same Twilio account as TWILIO_ACCOUNT_SID.`,
        );
        const result = await trySend(flowVars);
        return { ...result, contentVariables: flowVars };
      }
      throw error;
    }
  }

  private resolveTwilioContentSend(job: OutboundTextJob) {
    if (!job.twilioContent || job.channel === 'meta' || job.channel === 'baileys') {
      return null;
    }
    const plan = resolveEnquiryTwilioContentForSend(this.config, job.twilioContent, {
      twilioContentVariables: job.twilioContentVariables,
      text: job.text,
    });
    if (!plan && isTwilioContentSendDebug(this.config)) {
      this.logger.debug(
        `Twilio content skipped (no SID) conversation=${job.conversationId} template=${job.twilioContent}`,
      );
    }
    return plan;
  }

  private async resolveSendChannel(
    job: OutboundTextJob,
  ): Promise<WhatsappChannel | undefined> {
    if (job.channel) {
      return job.channel;
    }
    if (!job.tenantId) {
      return undefined;
    }
    const tenant = await this.tenants.findById(job.tenantId);
    const primary = tenant?.primaryChannel;
    if (primary === 'baileys' || primary === 'twilio') {
      return primary;
    }
    return undefined;
  }

  async sendAll(jobs: OutboundTextJob[]): Promise<void> {
    for (const job of jobs) {
      try {
        await this.sendText(job);
      } catch (error) {
        this.logger.error(
          `Failed to send WhatsApp text conversation=${job.conversationId} to=${job.to}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
