import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DivineBudgetModule } from '../divine-budget/divine-budget.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { EnquiryFlowService } from './enquiry-flow.service';
import { EnquirySession } from './enquiry-session.entity';
import { EnquirySessionService } from './enquiry-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnquirySession]),
    DivineBudgetModule,
    StateMachineModule,
  ],
  providers: [EnquirySessionService, EnquiryFlowService],
  exports: [EnquiryFlowService],
})
export class EnquiryFlowModule {}
