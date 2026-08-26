import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { DashboardBasicAuthGuard } from './dashboard-basic-auth.guard';
import { DashboardService } from './dashboard.service';
import {
  type ConversationDetail,
  type ConversationListResult,
  type DashboardFunnel,
  type DashboardToday,
  type DemoAnalyticsRow,
} from './dashboard.types';
import {
  parseDateQuery,
  parseLeadScoreQuery,
  parsePageQuery,
  parsePageSizeQuery,
} from './parse-dashboard-query';

@Controller('dashboard')
@UseGuards(DashboardBasicAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('today')
  async today(@Query('tenantId') tenantId?: string): Promise<DashboardToday> {
    const resolved = await this.dashboard.resolveTenantId(tenantId);
    return this.dashboard.getToday(resolved);
  }

  @Get('funnel')
  async funnel(@Query('tenantId') tenantId?: string): Promise<DashboardFunnel> {
    const resolved = await this.dashboard.resolveTenantId(tenantId);
    return this.dashboard.getFunnel(resolved);
  }

  @Get('conversations')
  async conversations(
    @Query('tenantId') tenantId?: string,
    @Query('leadScore') leadScore?: string,
    @Query('demoMode') demoMode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ConversationListResult> {
    const resolved = await this.dashboard.resolveTenantId(tenantId);
    return this.dashboard.listConversations(resolved, {
      leadScore: parseLeadScoreQuery(leadScore),
      demoMode: demoMode || undefined,
      from: parseDateQuery(from, 'from'),
      to: parseDateQuery(to, 'to'),
      page: parsePageQuery(page, 1),
      pageSize: parsePageSizeQuery(pageSize, 25, 100),
    });
  }

  @Get('conversations/:id')
  async conversation(
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ): Promise<ConversationDetail> {
    const resolved = await this.dashboard.resolveTenantId(tenantId);
    return this.dashboard.getConversation(resolved, id);
  }

  @Get('demo-analytics')
  async demoAnalytics(
    @Query('tenantId') tenantId?: string,
  ): Promise<DemoAnalyticsRow[]> {
    const resolved = await this.dashboard.resolveTenantId(tenantId);
    return this.dashboard.getDemoAnalytics(resolved);
  }
}
