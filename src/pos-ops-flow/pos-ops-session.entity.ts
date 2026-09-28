import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { PosOpsPayload } from './pos-ops-payload';

@Entity({ name: 'pos_ops_sessions' })
export class PosOpsSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'current_step', type: 'varchar', length: 64 })
  currentStep: string;

  @Column({ type: 'jsonb' })
  payload: PosOpsPayload;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reference: string | null;
}
