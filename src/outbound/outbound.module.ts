import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { MetaWhatsappClient } from './meta-whatsapp.client';
import { OutboundMessageService } from './outbound-message.service';
import { TwilioWhatsappClient } from './twilio-whatsapp.client';
import { WhatsappSendRouter } from './whatsapp-send.router';

@Module({
  imports: [ConversationModule],
  providers: [
    MetaWhatsappClient,
    TwilioWhatsappClient,
    WhatsappSendRouter,
    OutboundMessageService,
  ],
  exports: [OutboundMessageService],
})
export class OutboundModule {}
