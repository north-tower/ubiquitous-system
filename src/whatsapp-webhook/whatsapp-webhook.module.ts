import { Module } from '@nestjs/common';
import { AiOrchestratorModule } from '../ai-orchestrator/ai-orchestrator.module';
import { ConversationModule } from '../conversation/conversation.module';
import { OutboundModule } from '../outbound/outbound.module';
import { TenantModule } from '../tenant/tenant.module';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Module({
  imports: [
    TenantModule,
    ConversationModule,
    AiOrchestratorModule,
    OutboundModule,
  ],
  controllers: [WhatsappWebhookController, TwilioWebhookController],
  providers: [WhatsappWebhookService],
})
export class WhatsappWebhookModule {}
