import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoEngineModule } from '../demo-engine/demo-engine.module';
import { IndustryFlowModule } from '../industry-flow/industry-flow.module';
import { LeadModule } from '../lead/lead.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { TechfindIntakeFlowService } from './techfind-intake-flow.service';
import { TechfindIntakeSession } from './techfind-intake-session.entity';
import { TechfindIntakeSessionService } from './techfind-intake-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TechfindIntakeSession]),
    StateMachineModule,
    LeadModule,
    DemoEngineModule,
    IndustryFlowModule,
  ],
  providers: [TechfindIntakeSessionService, TechfindIntakeFlowService],
  exports: [TechfindIntakeFlowService],
})
export class TechfindIntakeModule {}
