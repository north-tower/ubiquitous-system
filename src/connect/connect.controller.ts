import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  parseDateQuery,
  parseLeadScoreQuery,
  parsePageQuery,
  parsePageSizeQuery,
} from '../dashboard/parse-dashboard-query';
import {
  type ConversationDetail,
  type ConversationListResult,
  type DashboardFunnel,
  type DashboardToday,
  type DemoAnalyticsRow,
} from '../dashboard/dashboard.types';
import { ConnectService, type ConnectLink } from './connect.service';

@Controller('connect')
export class ConnectController {
  constructor(private readonly connect: ConnectService) {}

  @Get(':token')
  link(@Param('token') token: string): Promise<ConnectLink> {
    return this.connect.link(token);
  }

  @Get(':token/today')
  today(@Param('token') token: string): Promise<DashboardToday> {
    return this.connect.today(token);
  }

  @Get(':token/funnel')
  funnel(@Param('token') token: string): Promise<DashboardFunnel> {
    return this.connect.funnel(token);
  }

  @Get(':token/demo-analytics')
  demoAnalytics(@Param('token') token: string): Promise<DemoAnalyticsRow[]> {
    return this.connect.demoAnalytics(token);
  }

  @Get(':token/conversations')
  conversations(
    @Param('token') token: string,
    @Query('leadScore') leadScore?: string,
    @Query('demoMode') demoMode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ConversationListResult> {
    return this.connect.conversations(token, {
      leadScore: parseLeadScoreQuery(leadScore),
      demoMode: demoMode || undefined,
      from: parseDateQuery(from, 'from'),
      to: parseDateQuery(to, 'to'),
      page: parsePageQuery(page, 1),
      pageSize: parsePageSizeQuery(pageSize, 25, 100),
    });
  }

  @Get(':token/conversations/:id')
  conversation(
    @Param('token') token: string,
    @Param('id') id: string,
  ): Promise<ConversationDetail> {
    return this.connect.conversation(token, id);
  }
}
