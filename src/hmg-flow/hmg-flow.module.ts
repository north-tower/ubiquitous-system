import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { HmgFlowService } from './hmg-flow.service';
import { HmgSession } from './hmg-session.entity';
import { HmgSessionService } from './hmg-session.service';

@Module({
  imports: [TypeOrmModule.forFeature([HmgSession]), StateMachineModule],
  providers: [HmgSessionService, HmgFlowService],
  exports: [HmgFlowService],
})
export class HmgFlowModule {}
