import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { EnquiryPayload } from './enquiry-payload';

/**
 * Per-conversation step + payload for the Divine Budget enquiry intake.
 * Lives here rather than in conversations.current_state because that
 * column is a Techfind-specific FSM with a CHECK constraint — widening it
 * would mix two products in one state machine.
 */
@Entity({ name: 'enquiry_sessions' })
export class EnquirySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'current_step', type: 'varchar', length: 64 })
  currentStep: string;

  @Column({ type: 'jsonb' })
  payload: EnquiryPayload;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  reference: string | null;
}
