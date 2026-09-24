import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { TenantModule } from '../tenant/tenant.module';
import { BaileysWhatsappClient } from './baileys-whatsapp.client';
import { MetaWhatsappClient } from './meta-whatsapp.client';
import { OutboundMessageService } from './outbound-message.service';
import { TwilioWhatsappClient } from './twilio-whatsapp.client';
import { WhatsappSendRouter } from './whatsapp-send.router';

@Module({
  imports: [ConversationModule, TenantModule],
  providers: [
    MetaWhatsappClient,
    TwilioWhatsappClient,
    BaileysWhatsappClient,
    WhatsappSendRouter,
    OutboundMessageService,
  ],
  exports: [OutboundMessageService, BaileysWhatsappClient],
})
export class OutboundModule {}
