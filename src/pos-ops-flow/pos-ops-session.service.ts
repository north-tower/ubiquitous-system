import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PosOpsSession } from './pos-ops-session.entity';
import type { PosOpsPayload } from './pos-ops-payload';

@Injectable()
export class PosOpsSessionService {
  constructor(
    @InjectRepository(PosOpsSession)
    private readonly sessions: Repository<PosOpsSession>,
  ) {}

  async start(
    conversationId: string,
    step: string,
    payload: PosOpsPayload = {},
  ): Promise<PosOpsSession> {
    return this.sessions.save(
      this.sessions.create({
        conversationId,
        currentStep: step,
        payload,
        closedAt: null,
        reference: null,
      }),
    );
  }

  async save(
    session: PosOpsSession,
    next: { step: string; payload: PosOpsPayload },
  ): Promise<PosOpsSession> {
    session.currentStep = next.step;
    session.payload = next.payload;
    return this.sessions.save(session);
  }

  async close(
    session: PosOpsSession,
    reference?: string,
  ): Promise<PosOpsSession> {
    session.closedAt = new Date();
    if (reference) {
      session.reference = reference;
    }
    return this.sessions.save(session);
  }

  async findActive(conversationId: string): Promise<PosOpsSession | null> {
    return this.sessions.findOne({
      where: { conversationId, closedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async closeOpen(conversationId: string): Promise<void> {
    await this.sessions
      .createQueryBuilder()
      .update(PosOpsSession)
      .set({ closedAt: new Date() })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('closed_at IS NULL')
      .execute();
  }
}
