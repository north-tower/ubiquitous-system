import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { Message } from '../conversation/message.entity';
import { DemoSimulation } from '../demo-engine/demo-simulation.entity';
import { LeadProfile } from '../lead/lead-profile.entity';
import { TenantModule } from '../tenant/tenant.module';
import { DashboardBasicAuthGuard } from './dashboard-basic-auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TenantModule,
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      DemoSimulation,
      LeadProfile,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService, DashboardBasicAuthGuard],
})
export class DashboardModule {}
