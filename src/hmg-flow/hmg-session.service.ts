import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { HmgSession } from './hmg-session.entity';
import type { HmgPayload } from './hmg-payload';

@Injectable()
export class HmgSessionService {
  constructor(
    @InjectRepository(HmgSession)
    private readonly sessions: Repository<HmgSession>,
  ) {}

  async start(
    conversationId: string,
    step: string,
    payload: HmgPayload = {},
  ): Promise<HmgSession> {
    return this.sessions.save(
      this.sessions.create({
        conversationId,
        currentStep: step,
        payload,
        submittedAt: null,
        reference: null,
      }),
    );
  }

  async save(
    session: HmgSession,
    next: { step: string; payload: HmgPayload },
  ): Promise<HmgSession> {
    session.currentStep = next.step;
    session.payload = next.payload;
    return this.sessions.save(session);
  }

  async markSubmitted(
    session: HmgSession,
    reference: string,
  ): Promise<HmgSession> {
    session.currentStep = 'SUBMITTED';
    session.submittedAt = new Date();
    session.reference = reference;
    return this.sessions.save(session);
  }

  async findActive(conversationId: string): Promise<HmgSession | null> {
    return this.sessions.findOne({
      where: { conversationId, submittedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findLatest(conversationId: string): Promise<HmgSession | null> {
    return this.sessions.findOne({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });
  }

  async closeOpen(conversationId: string): Promise<void> {
    await this.sessions
      .createQueryBuilder()
      .update(HmgSession)
      .set({ submittedAt: new Date() })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('submitted_at IS NULL')
      .execute();
  }
}
