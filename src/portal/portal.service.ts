import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectLink } from '../connect/connect.service';
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
import { DEFAULT_TENANT_FLOW, type TenantFlow } from '../tenant/tenant-flow';
import { TenantService } from '../tenant/tenant.service';
import { type PortalPrincipal } from './portal-auth.service';

@Injectable()
export class PortalService {
  constructor(
    private readonly tenants: TenantService,
    private readonly baileys: BaileysWhatsappClient,
    private readonly dashboard: DashboardService,
  ) {}

  async whatsapp(principal: PortalPrincipal): Promise<ConnectLink> {
    const tenant = await this.requireTenant(principal.tenantId);
    return this.snapshot(tenant.id, tenant.name, tenant.flow, tenant.linkedPhone);
  }

  async pair(principal: PortalPrincipal): Promise<ConnectLink> {
    await this.baileys.beginPairing(principal.tenantId);
    return this.whatsapp(principal);
  }

  async stopPair(principal: PortalPrincipal): Promise<ConnectLink> {
    await this.baileys.endPairing(principal.tenantId);
    return this.whatsapp(principal);
  }

  async today(principal: PortalPrincipal): Promise<DashboardToday> {
    return this.dashboard.getToday(principal.tenantId);
  }

  async funnel(principal: PortalPrincipal): Promise<DashboardFunnel> {
    return this.dashboard.getFunnel(principal.tenantId);
  }

  async demoAnalytics(principal: PortalPrincipal): Promise<DemoAnalyticsRow[]> {
    return this.dashboard.getDemoAnalytics(principal.tenantId);
  }

  async conversations(
    principal: PortalPrincipal,
    filters: ConversationListFilters,
  ): Promise<ConversationListResult> {
    return this.dashboard.listConversations(principal.tenantId, filters);
  }

  async conversation(
    principal: PortalPrincipal,
    id: string,
  ): Promise<ConversationDetail> {
    return this.dashboard.getConversation(principal.tenantId, id);
  }

  private async requireTenant(tenantId: string) {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Unknown tenant');
    }
    return tenant;
  }

  private snapshot(
    tenantId: string,
    name: string,
    flow: TenantFlow | null,
    linkedPhone: string | null,
  ): ConnectLink {
    const session = this.baileys.whatsappLink(tenantId);
    return {
      name,
      flow: flow ?? DEFAULT_TENANT_FLOW,
      status: session.status,
      linkedPhone,
      qrDataUrl: session.qrDataUrl,
    };
  }
}
