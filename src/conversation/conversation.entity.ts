import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationState } from '../state-machine/conversation-state.enum';

@Entity({ name: 'conversations' })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'prospect_phone', type: 'varchar', length: 32 })
  prospectPhone: string;

  @Column({
    name: 'current_state',
    type: 'varchar',
    length: 64,
    default: ConversationState.NEW,
  })
  currentState: ConversationState;

  @Column({ name: 'demo_mode', type: 'varchar', length: 64, nullable: true })
  demoMode: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
