import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TenantService } from '../tenant/tenant.service';
import { DEFAULT_INDUSTRY_FLOWS } from './industry-flow.defaults';
import { IndustryFlowService } from './industry-flow.service';

@Injectable()
export class IndustryFlowSeedService implements OnModuleInit {
  private readonly logger = new Logger(IndustryFlowSeedService.name);

  constructor(
    private readonly tenants: TenantService,
    private readonly flows: IndustryFlowService,
  ) {}

  async onModuleInit(): Promise<void> {
    const tenant = await this.tenants.findDefault();
    if (!tenant) {
      return;
    }
    if (tenant.flow !== 'techfind_demo') {
      return;
    }
    const existing = await this.flows.listForTenant(tenant.id);
    if (existing.length > 0) {
      return;
    }
    for (const defaults of DEFAULT_INDUSTRY_FLOWS) {
      await this.flows.upsertByDemoMode(tenant.id, defaults);
    }
    this.logger.log(
      `Seeded ${DEFAULT_INDUSTRY_FLOWS.length} PLAAGG industry flows for tenant ${tenant.id}`,
    );
  }
}
