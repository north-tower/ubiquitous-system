import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Conversation } from '../conversation/conversation.entity';
import { DemoSimulation } from '../demo-engine/demo-simulation.entity';
import { LeadProfile } from '../lead/lead-profile.entity';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { TenantService } from '../tenant/tenant.service';
import { DashboardRepository } from './dashboard.repository';
import {
  type ConversationDetail,
  type ConversationListFilters,
  type ConversationListItem,
  type ConversationListResult,
  type DashboardFunnel,
  type DashboardToday,
  type DemoAnalyticsRow,
  type FunnelStage,
} from './dashboard.types';
import {
  ANALYTICS_DEMO_MODES,
  QUALIFIED_STATES,
  SIMULATION_COMPLETED_STATES,
  SIMULATION_STARTED_STATES,
  conversionPercent,
} from './funnel-stages';
import { startOfDayInTimeZone } from './local-day';

const DEFAULT_TIMEZONE = 'Africa/Nairobi';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class DashboardService {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly tenants: TenantService,
    private readonly config: ConfigService,
  ) {}

  async resolveTenantId(queryTenantId?: string): Promise<string> {
    if (queryTenantId) {
      const tenant = await this.tenants.findById(queryTenantId);
      if (!tenant) {
        throw new NotFoundException('Unknown tenant');
      }
      return tenant.id;
    }
    const fallback = await this.tenants.findDefault();
    if (!fallback) {
      throw new ServiceUnavailableException('No tenant is configured');
    }
    return fallback.id;
  }

  async getToday(
    tenantId: string,
    now: Date = new Date(),
  ): Promise<DashboardToday> {
    const since = startOfDayInTimeZone(now, this.timezone());
    const snap = await this.repo.loadSnapshot(tenantId, since);
    const conversationById = indexById(snap.conversations);

    const whatsappConversations = new Set(
      snap.recentMessages.map((message) => message.conversationId),
    ).size;

    const newProspects = snap.conversations.filter((conversation) =>
      onOrAfter(conversation.createdAt, since),
    ).length;

    const simulationsStarted = snap.simulations.filter((simulation) =>
      onOrAfter(simulation.createdAt, since),
    ).length;

    const simulationsCompleted = snap.simulations.filter((simulation) => {
      if (
        !simulation.completedAt ||
        !onOrAfter(simulation.completedAt, since)
      ) {
        return false;
      }
      const conversation = conversationById.get(simulation.conversationId);
      return (
        conversation !== undefined &&
        SIMULATION_COMPLETED_STATES.has(conversation.currentState)
      );
    }).length;

    const scoredToday = snap.leads.filter(
      (lead) => lead.leadScore !== null && onOrAfter(lead.updatedAt, since),
    );

    const meetingsBooked = snap.conversations.filter(
      (conversation) =>
        conversation.currentState === ConversationState.MEETING_BOOKED &&
        onOrAfter(conversation.updatedAt, since),
    ).length;

    const humanHandoffs = snap.conversations.filter(
      (conversation) =>
        conversation.currentState === ConversationState.HUMAN_HANDOFF &&
        onOrAfter(conversation.updatedAt, since),
    ).length;

    return {
      whatsappConversations,
      newProspects,
      simulationsStarted,
      simulationsCompleted,
      qualifiedLeads: scoredToday.length,
      hotLeads: scoredToday.filter((lead) => lead.leadScore === 'HOT').length,
      meetingsBooked,
      humanHandoffs,
    };
  }

  async getFunnel(tenantId: string): Promise<DashboardFunnel> {
    const snap = await this.repo.loadSnapshot(tenantId, new Date(0));
    const startedIds = simulationStartedIds(
      snap.conversations,
      snap.simulations,
    );

    const counts = [
      snap.conversations.length,
      snap.conversations.filter(
        (conversation) => conversation.demoMode !== null,
      ).length,
      startedIds.size,
      snap.conversations.filter((conversation) =>
        SIMULATION_COMPLETED_STATES.has(conversation.currentState),
      ).length,
      snap.conversations.filter((conversation) =>
        QUALIFIED_STATES.has(conversation.currentState),
      ).length,
      snap.conversations.filter(
        (conversation) =>
          conversation.currentState === ConversationState.MEETING_BOOKED,
      ).length,
      0,
    ];

    const labels = [
      { key: 'whatsapp', label: 'WhatsApp conversations' },
      { key: 'business_identified', label: 'Business identified' },
      { key: 'simulation_started', label: 'Simulation started' },
      { key: 'simulation_completed', label: 'Simulation completed' },
      { key: 'qualified', label: 'Qualified' },
      { key: 'meeting_booked', label: 'Meeting booked' },
      { key: 'customer', label: 'Customer' },
    ];

    const stages: FunnelStage[] = labels.map((label, index) => ({
      ...label,
      count: counts[index],
      conversionFromPrevious:
        index === 0
          ? null
          : conversionPercent(counts[index - 1], counts[index]),
    }));

    return { stages };
  }

  async listConversations(
    tenantId: string,
    filters: ConversationListFilters,
  ): Promise<ConversationListResult> {
    const page = filters.page ?? DEFAULT_PAGE;
    const pageSize = Math.min(
      filters.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const { conversations, leads, total } = await this.repo.listConversations(
      tenantId,
      { ...filters, page, pageSize },
    );
    const leadByConversation = indexLeads(leads);

    const items: ConversationListItem[] = conversations.map((conversation) => {
      const lead = leadByConversation.get(conversation.id) ?? null;
      return toListItem(conversation, lead);
    });

    return { items, page, pageSize, total };
  }

  async getConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationDetail> {
    const bundle = await this.repo.findConversationBundle(
      tenantId,
      conversationId,
    );
    if (!bundle) {
      throw new NotFoundException('Conversation not found');
    }

    const { conversation, messages, lead } = bundle;
    return {
      id: conversation.id,
      customerPhone: conversation.prospectPhone,
      currentState: conversation.currentState,
      demoMode: conversation.demoMode,
      assignedSalesperson: null,
      nextAction: lead?.nextAction ?? null,
      createdAt: conversation.createdAt,
      lead: lead
        ? {
            businessName: lead.businessName,
            industry: conversation.demoMode,
            leadScore: lead.leadScore,
            painPoint: lead.painPoint,
            dailyEnquiryVolume: lead.dailyEnquiryVolume,
            currentProcess: lead.currentProcess,
            staffCount: lead.staffCount,
            existingSystem: lead.existingSystem,
            conversationSummary: lead.conversationSummary,
            requestedFeatures: lead.requestedFeatures ?? [],
          }
        : null,
      messages: messages.map((message) => ({
        id: message.id,
        direction: message.direction,
        text: message.text,
        createdAt: message.createdAt,
      })),
    };
  }

  async getDemoAnalytics(tenantId: string): Promise<DemoAnalyticsRow[]> {
    const snap = await this.repo.loadSnapshot(tenantId, new Date(0));
    const startedIds = simulationStartedIds(
      snap.conversations,
      snap.simulations,
    );
    const leadConversationIds = new Set(
      snap.leads.map((lead) => lead.conversationId),
    );

    return ANALYTICS_DEMO_MODES.map((demoMode) => {
      const inMode = snap.conversations.filter(
        (conversation) => conversation.demoMode === demoMode,
      );
      return {
        demoMode,
        started: inMode.filter((conversation) =>
          startedIds.has(conversation.id),
        ).length,
        completed: inMode.filter((conversation) =>
          SIMULATION_COMPLETED_STATES.has(conversation.currentState),
        ).length,
        leads: inMode.filter((conversation) =>
          leadConversationIds.has(conversation.id),
        ).length,
        meetings: inMode.filter(
          (conversation) =>
            conversation.currentState === ConversationState.MEETING_BOOKED,
        ).length,
      };
    });
  }

  private timezone(): string {
    return (
      this.config.get<string>('DASHBOARD_TIMEZONE')?.trim() || DEFAULT_TIMEZONE
    );
  }
}

function onOrAfter(date: Date, start: Date): boolean {
  return date.getTime() >= start.getTime();
}

function indexById(conversations: Conversation[]): Map<string, Conversation> {
  return new Map(
    conversations.map((conversation) => [conversation.id, conversation]),
  );
}

function indexLeads(leads: LeadProfile[]): Map<string, LeadProfile> {
  return new Map(leads.map((lead) => [lead.conversationId, lead]));
}

function simulationStartedIds(
  conversations: Conversation[],
  simulations: DemoSimulation[],
): Set<string> {
  const ids = new Set<string>();
  for (const simulation of simulations) {
    ids.add(simulation.conversationId);
  }
  for (const conversation of conversations) {
    if (SIMULATION_STARTED_STATES.has(conversation.currentState)) {
      ids.add(conversation.id);
    }
  }
  return ids;
}

function toListItem(
  conversation: Conversation,
  lead: LeadProfile | null,
): ConversationListItem {
  return {
    id: conversation.id,
    customerPhone: conversation.prospectPhone,
    businessName: lead?.businessName ?? null,
    industry: conversation.demoMode,
    leadScore: lead?.leadScore ?? null,
    currentState: conversation.currentState,
    demoMode: conversation.demoMode,
    assignedSalesperson: null,
    nextAction: lead?.nextAction ?? null,
    createdAt: conversation.createdAt,
  };
}
