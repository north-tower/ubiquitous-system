import { Module } from '@nestjs/common';
import { TechfindIntakeModule } from '../techfind-intake/techfind-intake.module';
import { ConversationModule } from '../conversation/conversation.module';
import { EnquiryFlowModule } from '../enquiry-flow/enquiry-flow.module';
import { OutboundModule } from '../outbound/outbound.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { TenantModule } from '../tenant/tenant.module';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Module({
  imports: [
    TenantModule,
    ConversationModule,
    TechfindIntakeModule,
    EnquiryFlowModule,
    OutboundModule,
    StateMachineModule,
  ],
  controllers: [WhatsappWebhookController, TwilioWebhookController],
  providers: [WhatsappWebhookService],
})
export class WhatsappWebhookModule {}
