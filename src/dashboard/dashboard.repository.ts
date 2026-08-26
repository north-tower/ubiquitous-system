import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { Message } from '../conversation/message.entity';
import { DemoSimulation } from '../demo-engine/demo-simulation.entity';
import { LeadProfile } from '../lead/lead-profile.entity';
import { type ConversationListFilters } from './dashboard.types';
import {
  type ConversationBundle,
  type DashboardSnapshot,
} from './dashboard.snapshot';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

@Injectable()
export class DashboardRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    @InjectRepository(DemoSimulation)
    private readonly simulations: Repository<DemoSimulation>,
    @InjectRepository(LeadProfile)
    private readonly leads: Repository<LeadProfile>,
  ) {}

  async loadSnapshot(
    tenantId: string,
    messagesSince: Date,
  ): Promise<DashboardSnapshot> {
    const conversations = await this.conversations.find({
      where: { tenantId },
    });
    const ids = conversations.map((conversation) => conversation.id);
    if (ids.length === 0) {
      return {
        conversations: [],
        simulations: [],
        leads: [],
        recentMessages: [],
      };
    }

    const [simulations, leads, recentMessages] = await Promise.all([
      this.simulations.find({ where: { conversationId: In(ids) } }),
      this.leads.find({ where: { conversationId: In(ids) } }),
      this.messages.find({
        where: {
          conversationId: In(ids),
          createdAt: MoreThanOrEqual(messagesSince),
        },
        select: { conversationId: true, createdAt: true, id: true },
      }),
    ]);

    return { conversations, simulations, leads, recentMessages };
  }

  async listConversations(
    tenantId: string,
    filters: ConversationListFilters,
  ): Promise<{
    conversations: Conversation[];
    leads: LeadProfile[];
    total: number;
  }> {
    const page = filters.page ?? DEFAULT_PAGE;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const qb = this.conversations
      .createQueryBuilder('c')
      .leftJoin(LeadProfile, 'lp', 'lp.conversation_id = c.id')
      .where('c.tenant_id = :tenantId', { tenantId });

    if (filters.leadScore) {
      qb.andWhere('lp.lead_score = :leadScore', {
        leadScore: filters.leadScore,
      });
    }
    if (filters.demoMode) {
      qb.andWhere('c.demo_mode = :demoMode', { demoMode: filters.demoMode });
    }
    if (filters.from) {
      qb.andWhere('c.created_at >= :from', { from: filters.from });
    }
    if (filters.to) {
      qb.andWhere('c.created_at < :to', { to: filters.to });
    }

    const total = await qb.clone().getCount();
    const conversations = await qb
      .orderBy('c.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const pageIds = conversations.map((conversation) => conversation.id);
    const leads =
      pageIds.length === 0
        ? []
        : await this.leads.find({ where: { conversationId: In(pageIds) } });

    return { conversations, leads, total };
  }

  async findConversationBundle(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationBundle | null> {
    const conversation = await this.conversations.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) {
      return null;
    }

    const [messages, lead] = await Promise.all([
      this.messages.find({
        where: { conversationId },
        order: { createdAt: 'ASC' },
      }),
      this.leads.findOne({ where: { conversationId } }),
    ]);

    return { conversation, messages, lead };
  }
}
