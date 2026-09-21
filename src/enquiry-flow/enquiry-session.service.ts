import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { EnquirySession } from './enquiry-session.entity';
import type { EnquiryPayload } from './enquiry-payload';

@Injectable()
export class EnquirySessionService {
  constructor(
    @InjectRepository(EnquirySession)
    private readonly sessions: Repository<EnquirySession>,
  ) {}

  async start(
    conversationId: string,
    step: string,
    payload: EnquiryPayload = {},
  ): Promise<EnquirySession> {
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
    session: EnquirySession,
    next: { step: string; payload: EnquiryPayload },
  ): Promise<EnquirySession> {
    session.currentStep = next.step;
    session.payload = next.payload;
    return this.sessions.save(session);
  }

  async markSubmitted(
    session: EnquirySession,
    reference: string,
  ): Promise<EnquirySession> {
    session.currentStep = 'SUBMITTED';
    session.submittedAt = new Date();
    session.reference = reference;
    return this.sessions.save(session);
  }

  async findActive(conversationId: string): Promise<EnquirySession | null> {
    return this.sessions.findOne({
      where: { conversationId, submittedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findLatest(conversationId: string): Promise<EnquirySession | null> {
    return this.sessions.findOne({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });
  }

  async closeOpen(conversationId: string): Promise<void> {
    await this.sessions
      .createQueryBuilder()
      .update(EnquirySession)
      .set({ submittedAt: new Date() })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('submitted_at IS NULL')
      .execute();
  }
}
