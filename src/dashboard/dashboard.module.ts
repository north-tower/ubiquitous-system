import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { Message } from '../conversation/message.entity';
import { DemoSimulation } from '../demo-engine/demo-simulation.entity';
import { EnquirySession } from '../enquiry-flow/enquiry-session.entity';
import { LeadProfile } from '../lead/lead-profile.entity';
import { OutboundModule } from '../outbound/outbound.module';
import { StateMachineModule } from '../state-machine/state-machine.module';
import { TenantModule } from '../tenant/tenant.module';
import { DashboardBasicAuthGuard } from './dashboard-basic-auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { DashboardTenantService } from './dashboard-tenant.service';

@Module({
  imports: [
    TenantModule,
    StateMachineModule,
    OutboundModule,
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      DemoSimulation,
      EnquirySession,
      LeadProfile,
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    DashboardRepository,
    DashboardService,
    DashboardTenantService,
    DashboardBasicAuthGuard,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
