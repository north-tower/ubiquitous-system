import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaileysWhatsappClient } from '../outbound/baileys-whatsapp.client';
import { PortalOnboardingService } from '../portal/portal-onboarding.service';
import { TenantService } from '../tenant/tenant.service';
import {
  type CreateTenantResult,
  type DashboardTenantSummary,
  type DashboardTenantWhatsapp,
} from './dashboard.types';

@Injectable()
export class DashboardTenantService {
  constructor(
    private readonly tenants: TenantService,
    private readonly baileys: BaileysWhatsappClient,
    private readonly onboarding: PortalOnboardingService,
  ) {}

  async create(body: {
    name?: unknown;
    flow?: unknown;
    primaryChannel?: unknown;
    email?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    appUrl?: unknown;
  }): Promise<CreateTenantResult> {
    const name = typeof body.name === 'string' ? body.name : '';
    const flow = typeof body.flow === 'string' ? body.flow : '';
    const primaryChannel =
      typeof body.primaryChannel === 'string' ? body.primaryChannel : '';
    const tenant = await this.tenants.createStaffTenant({
      name,
      flow,
      primaryChannel,
    });

    const email = typeof body.email === 'string' ? body.email : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName : '';
    const appUrl = typeof body.appUrl === 'string' ? body.appUrl : undefined;

    if (email && firstName && lastName) {
      const onboard = await this.onboarding.inviteOwnerForTenant({
        tenant,
        email,
        firstName,
        lastName,
        appUrl,
      });
      return {
        id: tenant.id,
        connectToken: tenant.connectToken,
        onboarding: {
          acceptUrl: onboard.acceptUrl,
          connectUrl: onboard.connectUrl,
          loginUrl: onboard.loginUrl,
          emailResult: onboard.emailResult,
        },
      };
    }

    return { id: tenant.id, connectToken: tenant.connectToken };
  }

  async resendOnboarding(
    id: string,
    appUrl?: string,
  ): Promise<NonNullable<CreateTenantResult['onboarding']>> {
    await this.requireTenant(id);
    const onboard = await this.onboarding.resendForTenant({ tenantId: id, appUrl });
    return {
      acceptUrl: onboard.acceptUrl,
      connectUrl: onboard.connectUrl,
      loginUrl: onboard.loginUrl,
      emailResult: onboard.emailResult,
    };
  }

  async pair(id: string): Promise<DashboardTenantWhatsapp> {
    const tenant = await this.requireTenant(id);
    this.assertBaileysPrimary(tenant.primaryChannel);
    await this.baileys.beginPairing(id);
    return this.whatsapp(id);
  }

  async stopPair(id: string): Promise<DashboardTenantWhatsapp> {
    const tenant = await this.requireTenant(id);
    this.assertBaileysPrimary(tenant.primaryChannel);
    await this.baileys.endPairing(id);
    return this.whatsapp(id);
  }

  async delete(id: string): Promise<{ ok: true }> {
    const tenant = await this.requireTenant(id);
    if (tenant.primaryChannel !== 'twilio') {
      await this.baileys.dropTenant(id);
    }
    const removed = await this.tenants.deleteById(id);
    if (!removed) {
      throw new NotFoundException('Unknown tenant');
    }
    return { ok: true };
  }

  async list(): Promise<DashboardTenantSummary[]> {
    const rows = await this.tenants.list();
    const summaries: DashboardTenantSummary[] = [];
    for (const tenant of rows) {
      const owner = await this.onboarding.findOwnerByTenantId(tenant.id);
      summaries.push({
        id: tenant.id,
        name: tenant.name,
        flow: tenant.flow,
        primaryChannel: tenant.primaryChannel,
        linkedPhone: tenant.linkedPhone,
        status: this.baileys.connectionStatus(tenant.id),
        connectToken: tenant.connectToken,
        ownerEmail: owner?.email ?? null,
        ownerStatus: owner?.status ?? null,
      });
    }
    return summaries;
  }

  async whatsapp(id: string): Promise<DashboardTenantWhatsapp> {
    const tenant = await this.requireTenant(id);
    const link = this.baileys.whatsappLink(tenant.id);
    return {
      status: link.status,
      linkedPhone: tenant.linkedPhone,
      qrDataUrl: link.qrDataUrl,
    };
  }

  async requireTenantForDashboard(id: string) {
    return this.requireTenant(id);
  }

  private async requireTenant(id: string) {
    const tenant = await this.tenants.findById(id);
    if (!tenant) {
      throw new NotFoundException('Unknown tenant');
    }
    return tenant;
  }

  private assertBaileysPrimary(
    primaryChannel: string | null | undefined,
  ): void {
    if (primaryChannel === 'twilio') {
      throw new BadRequestException(
        'This tenant uses Twilio. QR pairing is only for Baileys tenants.',
      );
    }
  }
}
