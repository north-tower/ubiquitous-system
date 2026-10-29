import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { HmgPayload } from './hmg-payload';

@Entity({ name: 'hmg_sessions' })
export class HmgSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'current_step', type: 'varchar', length: 64 })
  currentStep: string;

  @Column({ type: 'jsonb' })
  payload: HmgPayload;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  reference: string | null;
}
