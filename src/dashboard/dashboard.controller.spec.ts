import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConversationState } from '../state-machine/conversation-state.enum';
import { DashboardBasicAuthGuard } from './dashboard-basic-auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { type ConversationDetail } from './dashboard.types';

describe('DashboardController conversations/:id', () => {
  let controller: DashboardController;
  const dashboard = {
    resolveTenantId: jest.fn(),
    getConversation: jest.fn(),
  };

  beforeEach(async () => {
    dashboard.resolveTenantId.mockReset();
    dashboard.getConversation.mockReset();
    dashboard.resolveTenantId.mockResolvedValue('tenant-1');

    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: dashboard }],
    })
      .overrideGuard(DashboardBasicAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DashboardController);
  });

  it('returns 404 for an unknown conversation id', async () => {
    dashboard.getConversation.mockRejectedValue(
      new NotFoundException('Conversation not found'),
    );

    await expect(controller.conversation('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dashboard.getConversation).toHaveBeenCalledWith(
      'tenant-1',
      'missing',
    );
  });

  it('returns the detail shape for a known conversation', async () => {
    const detail: ConversationDetail = {
      id: 'c-scored',
      customerPhone: '+254700000005',
      currentState: ConversationState.LEAD_SCORED,
      demoMode: 'salon',
      assignedSalesperson: null,
      nextAction: 'Call today',
      createdAt: new Date('2026-08-26T08:00:00.000Z'),
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
        {
          id: 'm1',
          direction: 'in',
          text: 'hi',
          createdAt: new Date('2026-08-26T08:00:00.000Z'),
        },
      ],
    };
    dashboard.getConversation.mockResolvedValue(detail);

    await expect(controller.conversation('c-scored')).resolves.toEqual(detail);
  });
});
