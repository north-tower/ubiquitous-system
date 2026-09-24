import { Injectable, NotFoundException } from '@nestjs/common';
import { BaileysWhatsappClient } from '../outbound/baileys-whatsapp.client';
import { TenantService } from '../tenant/tenant.service';
import {
  type DashboardTenantSummary,
  type DashboardTenantWhatsapp,
} from './dashboard.types';

@Injectable()
export class DashboardTenantService {
  constructor(
    private readonly tenants: TenantService,
    private readonly baileys: BaileysWhatsappClient,
  ) {}

  async create(body: {
    name?: unknown;
    flow?: unknown;
  }): Promise<{ id: string }> {
    const name = typeof body.name === 'string' ? body.name : '';
    const flow = typeof body.flow === 'string' ? body.flow : '';
    const tenant = await this.tenants.createStaffTenant({ name, flow });
    await this.baileys.startSession(tenant.id);
    return { id: tenant.id };
  }

  async list(): Promise<DashboardTenantSummary[]> {
    const rows = await this.tenants.list();
    return rows.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      flow: tenant.flow,
      linkedPhone: tenant.linkedPhone,
      status: this.baileys.connectionStatus(tenant.id),
    }));
  }

  async whatsapp(id: string): Promise<DashboardTenantWhatsapp> {
    const tenant = await this.tenants.findById(id);
    if (!tenant) {
      throw new NotFoundException('Unknown tenant');
    }
    const link = this.baileys.whatsappLink(tenant.id);
    return {
      status: link.status,
      linkedPhone: tenant.linkedPhone,
      qrDataUrl: link.qrDataUrl,
    };
  }
}
