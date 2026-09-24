import { Injectable, NotFoundException } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import {
  type ConversationDetail,
  type ConversationListFilters,
  type ConversationListResult,
  type DashboardFunnel,
  type DashboardToday,
  type DemoAnalyticsRow,
} from '../dashboard/dashboard.types';
import { BaileysWhatsappClient } from '../outbound/baileys-whatsapp.client';
import { type BaileysSessionStatus } from '../outbound/baileys-session';
import { Tenant } from '../tenant/tenant.entity';
import { TenantService } from '../tenant/tenant.service';

export type ConnectLink = {
  name: string;
  status: BaileysSessionStatus | null;
  linkedPhone: string | null;
  qrDataUrl: string | null;
};

@Injectable()
export class ConnectService {
  constructor(
    private readonly tenants: TenantService,
    private readonly baileys: BaileysWhatsappClient,
    private readonly dashboard: DashboardService,
  ) {}

  async link(token: string): Promise<ConnectLink> {
    const tenant = await this.requireTenant(token);
    await this.baileys.startSession(tenant.id);
    const session = this.baileys.whatsappLink(tenant.id);
    return {
      name: tenant.name,
      status: session.status,
      linkedPhone: tenant.linkedPhone,
      qrDataUrl: session.qrDataUrl,
    };
  }

  async today(token: string): Promise<DashboardToday> {
    const tenant = await this.requireTenant(token);
    return this.dashboard.getToday(tenant.id);
  }

  async funnel(token: string): Promise<DashboardFunnel> {
    const tenant = await this.requireTenant(token);
    return this.dashboard.getFunnel(tenant.id);
  }

  async demoAnalytics(token: string): Promise<DemoAnalyticsRow[]> {
    const tenant = await this.requireTenant(token);
    return this.dashboard.getDemoAnalytics(tenant.id);
  }

  async conversations(
    token: string,
    filters: ConversationListFilters,
  ): Promise<ConversationListResult> {
    const tenant = await this.requireTenant(token);
    return this.dashboard.listConversations(tenant.id, filters);
  }

  async conversation(token: string, id: string): Promise<ConversationDetail> {
    const tenant = await this.requireTenant(token);
    return this.dashboard.getConversation(tenant.id, id);
  }

  private async requireTenant(token: string): Promise<Tenant> {
    const tenant = await this.tenants.findByConnectToken(token);
    if (!tenant) {
      throw new NotFoundException('Unknown connect link');
    }
    return tenant;
  }
}
