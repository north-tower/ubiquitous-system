import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from '../dashboard/dashboard.module';
import { OutboundModule } from '../outbound/outbound.module';
import { TenantModule } from '../tenant/tenant.module';
import { EmailService } from './email.service';
import { PortalAuthService } from './portal-auth.service';
import { PortalController } from './portal.controller';
import { PortalOnboardingService } from './portal-onboarding.service';
import { PortalService } from './portal.service';
import { PortalSessionGuard } from './portal-session.guard';
import { TenantInvitation } from './tenant-invitation.entity';
import { TenantSession } from './tenant-session.entity';
import { TenantUser } from './tenant-user.entity';

@Module({
  imports: [
    TenantModule,
    OutboundModule,
    forwardRef(() => DashboardModule),
    TypeOrmModule.forFeature([TenantUser, TenantInvitation, TenantSession]),
  ],
  controllers: [PortalController],
  providers: [
    EmailService,
    PortalOnboardingService,
    PortalAuthService,
    PortalService,
    PortalSessionGuard,
  ],
  exports: [PortalOnboardingService, EmailService],
})
export class PortalModule {}
