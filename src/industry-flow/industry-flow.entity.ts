import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  IndustryFlowDefinitionBody,
  IndustryFlowEngineKind,
} from './industry-flow.types';

@Entity({ name: 'industry_flow_definitions' })
export class IndustryFlowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'demo_mode', type: 'varchar', length: 64 })
  demoMode: string;

  @Column({ name: 'menu_label', type: 'varchar', length: 128 })
  menuLabel: string;

  @Column({ name: 'plaagg_menu_id', type: 'varchar', length: 64 })
  plaaggMenuId: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'engine_kind', type: 'varchar', length: 16 })
  engineKind: IndustryFlowEngineKind;

  @Column({ type: 'jsonb' })
  definition: IndustryFlowDefinitionBody;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
