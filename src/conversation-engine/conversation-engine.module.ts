import { Module } from '@nestjs/common';
import { DemoEngineModule } from '../demo-engine/demo-engine.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { ConversationEngineService } from './conversation-engine.service';

@Module({
  imports: [StateMachineModule, DemoEngineModule],
  providers: [ConversationEngineService],
  exports: [ConversationEngineService],
})
export class ConversationEngineModule {}
