import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  parseDateQuery,
  parseLeadScoreQuery,
  parsePageQuery,
  parsePageSizeQuery,
} from '../dashboard/parse-dashboard-query';
import { ConnectLink } from '../connect/connect.service';
import {
  type ConversationDetail,
  type ConversationListResult,
  type DashboardFunnel,
  type DashboardToday,
  type DemoAnalyticsRow,
} from '../dashboard/dashboard.types';
import { TenantService } from '../tenant/tenant.service';
import { DEFAULT_TENANT_FLOW } from '../tenant/tenant-flow';
import { PortalAuthService, type PortalSessionPayload } from './portal-auth.service';
import { PortalService } from './portal.service';
import { PortalSessionGuard, type PortalRequest } from './portal-session.guard';

@Controller('portal')
export class PortalController {
  constructor(
    private readonly auth: PortalAuthService,
    private readonly portal: PortalService,
    private readonly tenants: TenantService,
  ) {}

  @Post('login')
  login(
    @Body() body: { email?: unknown; password?: unknown },
  ): Promise<PortalSessionPayload> {
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    return this.auth.login(email, password);
  }

  @Get('invitations/:token')
  previewInvite(@Param('token') token: string) {
    return this.auth.previewInvite(token);
  }

  @Post('invitations/:token/accept')
  acceptInvite(
    @Param('token') token: string,
    @Body() body: { password?: unknown },
  ): Promise<PortalSessionPayload> {
    const password = typeof body.password === 'string' ? body.password : '';
    return this.auth.acceptInvite(token, password);
  }

  @Post('logout')
  @UseGuards(PortalSessionGuard)
  async logout(@Req() req: PortalRequest): Promise<{ ok: true }> {
    const token = bearerFrom(req);
    if (token) {
      await this.auth.logout(token);
    }
    return { ok: true };
  }

  @Get('me')
  @UseGuards(PortalSessionGuard)
  async me(@Req() req: PortalRequest) {
    const principal = requireUser(req);
    const tenant = await this.tenants.findById(principal.tenantId);
    return {
      ...principal,
      tenantName: tenant?.name ?? 'Your business',
      flow: tenant?.flow ?? DEFAULT_TENANT_FLOW,
    };
  }

  @Get('whatsapp')
  @UseGuards(PortalSessionGuard)
  whatsapp(@Req() req: PortalRequest): Promise<ConnectLink> {
    return this.portal.whatsapp(requireUser(req));
  }

  @Post('whatsapp/pair')
  @UseGuards(PortalSessionGuard)
  pair(@Req() req: PortalRequest): Promise<ConnectLink> {
    return this.portal.pair(requireUser(req));
  }

  @Post('whatsapp/pair/stop')
  @UseGuards(PortalSessionGuard)
  stopPair(@Req() req: PortalRequest): Promise<ConnectLink> {
    return this.portal.stopPair(requireUser(req));
  }

  @Get('today')
  @UseGuards(PortalSessionGuard)
  today(@Req() req: PortalRequest): Promise<DashboardToday> {
    return this.portal.today(requireUser(req));
  }

  @Get('funnel')
  @UseGuards(PortalSessionGuard)
  funnel(@Req() req: PortalRequest): Promise<DashboardFunnel> {
    return this.portal.funnel(requireUser(req));
  }

  @Get('demo-analytics')
  @UseGuards(PortalSessionGuard)
  demoAnalytics(@Req() req: PortalRequest): Promise<DemoAnalyticsRow[]> {
    return this.portal.demoAnalytics(requireUser(req));
  }

  @Get('conversations')
  @UseGuards(PortalSessionGuard)
  conversations(
    @Req() req: PortalRequest,
    @Query('leadScore') leadScore?: string,
    @Query('demoMode') demoMode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ConversationListResult> {
    return this.portal.conversations(requireUser(req), {
      leadScore: parseLeadScoreQuery(leadScore),
      demoMode: demoMode || undefined,
      from: parseDateQuery(from, 'from'),
      to: parseDateQuery(to, 'to'),
      page: parsePageQuery(page, 1),
      pageSize: parsePageSizeQuery(pageSize, 25, 100),
    });
  }

  @Get('conversations/:id')
  @UseGuards(PortalSessionGuard)
  conversation(
    @Req() req: PortalRequest,
    @Param('id') id: string,
  ): Promise<ConversationDetail> {
    return this.portal.conversation(requireUser(req), id);
  }
}

function requireUser(req: PortalRequest) {
  if (!req.portalUser) {
    throw new Error('Portal guard did not attach user');
  }
  return req.portalUser;
}

function bearerFrom(req: PortalRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim() || null;
}
