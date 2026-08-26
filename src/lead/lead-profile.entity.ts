import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LeadScore = 'HOT' | 'WARM' | 'COLD';

@Entity({ name: 'lead_profiles' })
export class LeadProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid', unique: true })
  conversationId: string;

  @Column({
    name: 'business_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  businessName: string | null;

  @Column({ name: 'daily_enquiry_volume', type: 'int', nullable: true })
  dailyEnquiryVolume: number | null;

  @Column({ name: 'current_process', type: 'text', nullable: true })
  currentProcess: string | null;

  @Column({ name: 'staff_count', type: 'int', nullable: true })
  staffCount: number | null;

  @Column({ name: 'existing_system', type: 'text', nullable: true })
  existingSystem: string | null;

  @Column({ name: 'pain_point', type: 'text', nullable: true })
  painPoint: string | null;

  @Column({ name: 'requested_features', type: 'jsonb', default: [] })
  requestedFeatures: string[];

  @Column({ name: 'conversation_summary', type: 'text', nullable: true })
  conversationSummary: string | null;

  @Column({ name: 'lead_score', type: 'varchar', length: 8, nullable: true })
  leadScore: LeadScore | null;

  @Column({ name: 'next_action', type: 'text', nullable: true })
  nextAction: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
