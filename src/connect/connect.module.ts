import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { OutboundModule } from '../outbound/outbound.module';
import { TenantModule } from '../tenant/tenant.module';
import { ConnectController } from './connect.controller';
import { ConnectService } from './connect.service';

@Module({
  imports: [TenantModule, OutboundModule, DashboardModule],
  controllers: [ConnectController],
  providers: [ConnectService],
})
export class ConnectModule {}
