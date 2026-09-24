import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { TechfindIntakePayload } from './techfind-intake-payload';

@Entity({ name: 'techfind_intake_sessions' })
export class TechfindIntakeSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'current_step', type: 'varchar', length: 64 })
  currentStep: string;

  @Column({ type: 'jsonb', default: {} })
  payload: TechfindIntakePayload;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
