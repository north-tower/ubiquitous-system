import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { ConversationStateMachineService } from './conversation-state-machine.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation])],
  providers: [ConversationStateMachineService],
  exports: [ConversationStateMachineService],
})
export class StateMachineModule {}
