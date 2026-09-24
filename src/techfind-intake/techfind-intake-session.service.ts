import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { TechfindIntakePayload } from './techfind-intake-payload';
import { TechfindIntakeSession } from './techfind-intake-session.entity';

@Injectable()
export class TechfindIntakeSessionService {
  constructor(
    @InjectRepository(TechfindIntakeSession)
    private readonly sessions: Repository<TechfindIntakeSession>,
  ) {}

  async start(
    conversationId: string,
    step: string,
    payload: TechfindIntakePayload = {},
  ): Promise<TechfindIntakeSession> {
    return this.sessions.save(
      this.sessions.create({
        conversationId,
        currentStep: step,
        payload,
        completedAt: null,
      }),
    );
  }

  async save(
    session: TechfindIntakeSession,
    next: { step: string; payload: TechfindIntakePayload },
  ): Promise<TechfindIntakeSession> {
    session.currentStep = next.step;
    session.payload = next.payload;
    return this.sessions.save(session);
  }

  async markComplete(session: TechfindIntakeSession): Promise<TechfindIntakeSession> {
    session.currentStep = 'COMPLETE';
    session.completedAt = new Date();
    return this.sessions.save(session);
  }

  async findActive(conversationId: string): Promise<TechfindIntakeSession | null> {
    return this.sessions.findOne({
      where: { conversationId, completedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findLatest(conversationId: string): Promise<TechfindIntakeSession | null> {
    return this.sessions.findOne({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });
  }

  async closeOpen(conversationId: string): Promise<void> {
    await this.sessions
      .createQueryBuilder()
      .update(TechfindIntakeSession)
      .set({ completedAt: new Date() })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('completed_at IS NULL')
      .execute();
  }
}
