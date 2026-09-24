import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IndustryFlowService } from '../industry-flow/industry-flow.service';
import { parseUpsertIndustryFlow } from '../industry-flow/industry-flow.validation';
import type { IndustryFlowRecord } from '../industry-flow/industry-flow.types';
import { DashboardBasicAuthGuard } from './dashboard-basic-auth.guard';
import { DashboardTenantService } from './dashboard-tenant.service';
import { DashboardService } from './dashboard.service';
import {
  type ConversationDetail,
  type ConversationListResult,
  type DashboardFunnel,
  type CreateTenantResult,
  type DashboardTenantSummary,
  type DashboardTenantWhatsapp,
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
  constructor(
    private readonly dashboard: DashboardService,
    private readonly tenantLinks: DashboardTenantService,
    private readonly industryFlows: IndustryFlowService,
  ) {}

  @Post('tenants')
  createTenant(
    @Body()
    body: {
      name?: unknown;
      flow?: unknown;
      email?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      appUrl?: unknown;
    },
  ): Promise<CreateTenantResult> {
    return this.tenantLinks.create(body ?? {});
  }

  @Post('tenants/:id/resend-onboarding')
  resendTenantOnboarding(
    @Param('id') id: string,
    @Body() body: { appUrl?: unknown },
  ): Promise<NonNullable<CreateTenantResult['onboarding']>> {
    const appUrl = typeof body?.appUrl === 'string' ? body.appUrl : undefined;
    return this.tenantLinks.resendOnboarding(id, appUrl);
  }

  @Get('tenants')
  listTenants(): Promise<DashboardTenantSummary[]> {
    return this.tenantLinks.list();
  }

  @Get('tenants/:id/whatsapp')
  tenantWhatsapp(@Param('id') id: string): Promise<DashboardTenantWhatsapp> {
    return this.tenantLinks.whatsapp(id);
  }

  @Post('tenants/:id/whatsapp/pair')
  pairTenant(@Param('id') id: string): Promise<DashboardTenantWhatsapp> {
    return this.tenantLinks.pair(id);
  }

  @Post('tenants/:id/whatsapp/pair/stop')
  stopTenantPair(@Param('id') id: string): Promise<DashboardTenantWhatsapp> {
    return this.tenantLinks.stopPair(id);
  }

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

  @Post('conversations/:id/handoff')
  async handoffConversation(
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ): Promise<ConversationDetail> {
    const resolved = await this.dashboard.resolveTenantId(tenantId);
    return this.dashboard.handoffConversation(resolved, id);
  }

  @Post('conversations/:id/resume-automation')
  async resumeConversationAutomation(
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ): Promise<ConversationDetail> {
    const resolved = await this.dashboard.resolveTenantId(tenantId);
    return this.dashboard.resumeConversationAutomation(resolved, id);
  }

  @Get('demo-analytics')
  async demoAnalytics(
    @Query('tenantId') tenantId?: string,
  ): Promise<DemoAnalyticsRow[]> {
    const resolved = await this.dashboard.resolveTenantId(tenantId);
    return this.dashboard.getDemoAnalytics(resolved);
  }

  @Get('tenants/:tenantId/industry-flows')
  async listIndustryFlows(
    @Param('tenantId') tenantId: string,
  ): Promise<IndustryFlowRecord[]> {
    await this.tenantLinks.requireTenantForDashboard(tenantId);
    return this.industryFlows.listForTenant(tenantId);
  }

  @Get('tenants/:tenantId/industry-flows/:flowId')
  async getIndustryFlow(
    @Param('tenantId') tenantId: string,
    @Param('flowId') flowId: string,
  ): Promise<IndustryFlowRecord> {
    await this.tenantLinks.requireTenantForDashboard(tenantId);
    return this.industryFlows.findById(tenantId, flowId);
  }

  @Post('tenants/:tenantId/industry-flows')
  async createIndustryFlow(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
  ): Promise<IndustryFlowRecord> {
    await this.tenantLinks.requireTenantForDashboard(tenantId);
    return this.industryFlows.create(tenantId, parseUpsertIndustryFlow(body));
  }

  @Patch('tenants/:tenantId/industry-flows/:flowId')
  async updateIndustryFlow(
    @Param('tenantId') tenantId: string,
    @Param('flowId') flowId: string,
    @Body() body: unknown,
  ): Promise<IndustryFlowRecord> {
    await this.tenantLinks.requireTenantForDashboard(tenantId);
    return this.industryFlows.update(
      tenantId,
      flowId,
      parseUpsertIndustryFlow(body),
    );
  }
}
