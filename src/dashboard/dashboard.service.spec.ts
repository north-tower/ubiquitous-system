import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Conversation } from '../conversation/conversation.entity';
import { Message } from '../conversation/message.entity';
import { DemoSimulation } from '../demo-engine/demo-simulation.entity';
import { LeadProfile } from '../lead/lead-profile.entity';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { TenantService } from '../tenant/tenant.service';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { type DashboardSnapshot } from './dashboard.snapshot';

const TENANT = 'tenant-1';
const OTHER = 'tenant-other';
const NOW = new Date('2026-08-26T10:00:00.000Z');
const TODAY = new Date('2026-08-26T08:00:00.000Z');
const YESTERDAY = new Date('2026-08-25T10:00:00.000Z');

function conv(overrides: Partial<Conversation>): Conversation {
  return {
    id: 'c-default',
    tenantId: TENANT,
    prospectPhone: '+254700000000',
    currentState: ConversationState.NEW,
    demoMode: null,
    createdAt: YESTERDAY,
    updatedAt: YESTERDAY,
    ...overrides,
  };
}

function sim(overrides: Partial<DemoSimulation>): DemoSimulation {
  return {
    id: 'sim-default',
    conversationId: 'c-default',
    demoMode: 'salon',
    currentStep: 'start',
    payload: {},
    createdAt: YESTERDAY,
    completedAt: null,
    ...overrides,
  };
}

function lead(overrides: Partial<LeadProfile>): LeadProfile {
  return {
    id: 'lead-default',
    conversationId: 'c-default',
    businessName: null,
    dailyEnquiryVolume: null,
    currentProcess: null,
    staffCount: null,
    existingSystem: null,
    painPoint: null,
    requestedFeatures: [],
    conversationSummary: null,
    leadScore: null,
    nextAction: null,
    createdAt: YESTERDAY,
    updatedAt: YESTERDAY,
    ...overrides,
  };
}

function seededFunnel(): DashboardSnapshot {
  const conversations = [
    conv({
      id: 'c-new',
      prospectPhone: '+254700000001',
      currentState: ConversationState.NEW,
    }),
    conv({
      id: 'c-greeting',
      prospectPhone: '+254700000002',
      currentState: ConversationState.INDUSTRY_DISCOVERY,
    }),
    conv({
      id: 'c-running',
      prospectPhone: '+254700000003',
      currentState: ConversationState.DEMO_RUNNING,
      demoMode: 'salon',
    }),
    conv({
      id: 'c-reveal',
      prospectPhone: '+254700000004',
      currentState: ConversationState.VALUE_REVEAL,
      demoMode: 'solar',
    }),
    conv({
      id: 'c-scored',
      prospectPhone: '+254700000005',
      currentState: ConversationState.LEAD_SCORED,
      demoMode: 'salon',
      updatedAt: TODAY,
    }),
    conv({
      id: 'c-meeting',
      prospectPhone: '+254700000006',
      currentState: ConversationState.MEETING_BOOKED,
      demoMode: 'solar',
      updatedAt: TODAY,
    }),
    conv({
      id: 'c-handoff',
      prospectPhone: '+254700000007',
      currentState: ConversationState.HUMAN_HANDOFF,
      demoMode: 'salon',
      createdAt: TODAY,
      updatedAt: YESTERDAY,
    }),
    conv({
      id: 'c-other-tenant',
      tenantId: OTHER,
      prospectPhone: '+254700000099',
      currentState: ConversationState.MEETING_BOOKED,
      demoMode: 'salon',
    }),
  ];

  const simulations = [
    sim({ id: 's-running', conversationId: 'c-running', createdAt: TODAY }),
    sim({
      id: 's-reveal',
      conversationId: 'c-reveal',
      demoMode: 'solar',
      createdAt: YESTERDAY,
      completedAt: TODAY,
    }),
    sim({
      id: 's-scored',
      conversationId: 'c-scored',
      createdAt: YESTERDAY,
      completedAt: YESTERDAY,
    }),
    sim({
      id: 's-meeting',
      conversationId: 'c-meeting',
      demoMode: 'solar',
      createdAt: YESTERDAY,
      completedAt: YESTERDAY,
    }),
    sim({
      id: 's-handoff',
      conversationId: 'c-handoff',
      createdAt: YESTERDAY,
      completedAt: YESTERDAY,
    }),
    sim({
      id: 's-other',
      conversationId: 'c-other-tenant',
      createdAt: TODAY,
      completedAt: TODAY,
    }),
  ];

  const leads = [
    lead({
      id: 'l-scored',
      conversationId: 'c-scored',
      businessName: 'Glow Salon',
      leadScore: 'HOT',
      nextAction: 'Call today',
      updatedAt: TODAY,
    }),
    lead({
      id: 'l-meeting',
      conversationId: 'c-meeting',
      businessName: 'Sun Roof Co',
      leadScore: 'WARM',
      updatedAt: TODAY,
    }),
    lead({
      id: 'l-handoff',
      conversationId: 'c-handoff',
      businessName: 'Quiet Cuts',
      leadScore: 'COLD',
      updatedAt: YESTERDAY,
    }),
    lead({
      id: 'l-other',
      conversationId: 'c-other-tenant',
      leadScore: 'HOT',
      updatedAt: TODAY,
    }),
  ];

  const recentMessages = [
    { conversationId: 'c-new', createdAt: TODAY },
    { conversationId: 'c-new', createdAt: TODAY },
    { conversationId: 'c-scored', createdAt: TODAY },
    { conversationId: 'c-other-tenant', createdAt: TODAY },
  ];

  return {
    conversations: conversations.filter((row) => row.tenantId === TENANT),
    simulations: simulations.filter((row) =>
      conversations.some(
        (conversation) =>
          conversation.id === row.conversationId &&
          conversation.tenantId === TENANT,
      ),
    ),
    leads: leads.filter((row) =>
      conversations.some(
        (conversation) =>
          conversation.id === row.conversationId &&
          conversation.tenantId === TENANT,
      ),
    ),
    recentMessages: recentMessages.filter((row) =>
      conversations.some(
        (conversation) =>
          conversation.id === row.conversationId &&
          conversation.tenantId === TENANT,
      ),
    ),
  };
}

describe('DashboardService aggregations', () => {
  const snapshot = seededFunnel();
  const repo = {
    loadSnapshot: jest.fn(),
    listConversations: jest.fn(),
    findConversationBundle: jest.fn(),
  };
  const tenants = {
    findById: jest.fn(),
    findDefault: jest.fn(),
  };
  const config = { get: jest.fn() };
  const service = new DashboardService(
    repo as unknown as DashboardRepository,
    tenants as unknown as TenantService,
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    repo.loadSnapshot.mockReset();
    repo.listConversations.mockReset();
    repo.findConversationBundle.mockReset();
    tenants.findById.mockReset();
    tenants.findDefault.mockReset();
    config.get.mockReset();
    repo.loadSnapshot.mockResolvedValue(snapshot);
    config.get.mockReturnValue('UTC');
    tenants.findDefault.mockResolvedValue({ id: TENANT });
  });

  it('counts funnel stages from current state without inventing a customer flag', async () => {
    const funnel = await service.getFunnel(TENANT);

    expect(funnel.stages.map((stage) => [stage.key, stage.count])).toEqual([
      ['whatsapp', 7],
      ['business_identified', 5],
      ['simulation_started', 5],
      ['simulation_completed', 4],
      ['qualified', 3],
      ['meeting_booked', 1],
      ['customer', 0],
    ]);
    expect(funnel.stages[0].conversionFromPrevious).toBeNull();
    expect(funnel.stages[1].conversionFromPrevious).toBe(71.4);
    expect(funnel.stages[2].conversionFromPrevious).toBe(100);
    expect(funnel.stages[3].conversionFromPrevious).toBe(80);
    expect(funnel.stages[4].conversionFromPrevious).toBe(75);
    expect(funnel.stages[5].conversionFromPrevious).toBe(33.3);
    expect(funnel.stages[6].conversionFromPrevious).toBe(0);
  });

  it('counts today metrics from existing rows since local midnight', async () => {
    const today = await service.getToday(TENANT, NOW);

    expect(today).toEqual({
      whatsappConversations: 2,
      newProspects: 1,
      simulationsStarted: 1,
      simulationsCompleted: 1,
      qualifiedLeads: 2,
      hotLeads: 1,
      meetingsBooked: 1,
      humanHandoffs: 0,
    });
    expect(repo.loadSnapshot).toHaveBeenCalledWith(
      TENANT,
      new Date('2026-08-26T00:00:00.000Z'),
    );
  });

  it('groups demo analytics by salon and solar only', async () => {
    const rows = await service.getDemoAnalytics(TENANT);
    expect(rows).toEqual([
      {
        demoMode: 'salon',
        started: 3,
        completed: 2,
        leads: 2,
        meetings: 0,
      },
      {
        demoMode: 'solar',
        started: 2,
        completed: 2,
        leads: 1,
        meetings: 1,
      },
    ]);
  });

  it('returns conversation detail shape and 404s unknown ids', async () => {
    repo.findConversationBundle.mockResolvedValueOnce(null);
    await expect(
      service.getConversation(TENANT, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const conversation = conv({
      id: 'c-scored',
      prospectPhone: '+254700000005',
      currentState: ConversationState.LEAD_SCORED,
      demoMode: 'salon',
    });
    const profile = lead({
      conversationId: 'c-scored',
      businessName: 'Glow Salon',
      leadScore: 'HOT',
      painPoint: 'Missed bookings',
      dailyEnquiryVolume: 40,
      conversationSummary: 'Salon owner wants overnight replies.',
      nextAction: 'Call today',
    });
    const messages: Message[] = [
      {
        id: 'm1',
        conversationId: 'c-scored',
        direction: 'in',
        text: 'hi',
        rawPayload: {},
        createdAt: TODAY,
      },
      {
        id: 'm2',
        conversationId: 'c-scored',
        direction: 'out',
        text: 'Welcome to Techfind',
        rawPayload: {},
        createdAt: TODAY,
      },
    ];
    repo.findConversationBundle.mockResolvedValueOnce({
      conversation,
      messages,
      lead: profile,
    });

    await expect(service.getConversation(TENANT, 'c-scored')).resolves.toEqual({
      id: 'c-scored',
      customerPhone: '+254700000005',
      currentState: ConversationState.LEAD_SCORED,
      demoMode: 'salon',
      assignedSalesperson: null,
      nextAction: 'Call today',
      createdAt: conversation.createdAt,
      lead: {
        businessName: 'Glow Salon',
        industry: 'salon',
        leadScore: 'HOT',
        painPoint: 'Missed bookings',
        dailyEnquiryVolume: 40,
        currentProcess: null,
        staffCount: null,
        existingSystem: null,
        conversationSummary: 'Salon owner wants overnight replies.',
        requestedFeatures: [],
      },
      messages: [
        { id: 'm1', direction: 'in', text: 'hi', createdAt: TODAY },
        {
          id: 'm2',
          direction: 'out',
          text: 'Welcome to Techfind',
          createdAt: TODAY,
        },
      ],
    });
  });
});
