import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'ai_usage_events' })
export class AIUsageEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ type: 'varchar', length: 32 })
  provider: 'openai';

  @Column({ type: 'varchar', length: 64 })
  model: string;

  @Column({ name: 'input_tokens', type: 'int' })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'int' })
  outputTokens: number;

  @Column({ name: 'estimated_cost_usd', type: 'double precision' })
  estimatedCostUsd: number;

  @Column({ type: 'varchar', length: 64 })
  purpose: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
