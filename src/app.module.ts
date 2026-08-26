import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiOrchestratorModule } from './ai-orchestrator/ai-orchestrator.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationEngineModule } from './conversation-engine/conversation-engine.module';
import { ConversationModule } from './conversation/conversation.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { DemoEngineModule } from './demo-engine/demo-engine.module';
import { LeadModule } from './lead/lead.module';
import { OutboundModule } from './outbound/outbound.module';
import { StateMachineModule } from './state-machine/state-machine.module';
import { TenantModule } from './tenant/tenant.module';
import { WhatsappWebhookModule } from './whatsapp-webhook/whatsapp-webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TenantModule,
    ConversationModule,
    StateMachineModule,
    DemoEngineModule,
    ConversationEngineModule,
    LeadModule,
    DashboardModule,
    AiOrchestratorModule,
    OutboundModule,
    WhatsappWebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
