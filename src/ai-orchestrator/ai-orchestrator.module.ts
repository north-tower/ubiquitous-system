import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { DemoEngineModule } from '../demo-engine/demo-engine.module';
import { LeadModule } from '../lead/lead.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { AiClientModule } from './ai-client.module';
import { AiOrchestratorService } from './ai-orchestrator.service';

@Module({
  imports: [
    AiClientModule,
    ConversationModule,
    StateMachineModule,
    DemoEngineModule,
    LeadModule,
  ],
  providers: [AiOrchestratorService],
  exports: [AiOrchestratorService],
})
export class AiOrchestratorModule {}
