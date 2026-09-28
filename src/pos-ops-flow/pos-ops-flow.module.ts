import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsightfulPosModule } from '../insightful-pos/insightful-pos.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { PosOpsFlowService } from './pos-ops-flow.service';
import { PosOpsSession } from './pos-ops-session.entity';
import { PosOpsSessionService } from './pos-ops-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PosOpsSession]),
    InsightfulPosModule,
    StateMachineModule,
  ],
  providers: [PosOpsSessionService, PosOpsFlowService],
  exports: [PosOpsFlowService],
})
export class PosOpsFlowModule {}
