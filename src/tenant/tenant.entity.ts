import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DEFAULT_TENANT_FLOW, type TenantFlow } from './tenant-flow';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    name: 'whatsapp_phone_number_id',
    type: 'varchar',
    length: 64,
    unique: true,
  })
  whatsappPhoneNumberId: string;

  @Column({
    name: 'whatsapp_business_account_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  whatsappBusinessAccountId: string | null;

  /**
   * Which conversation the inbound webhook runs for this tenant.
   * techfind_demo is the existing lead-gen product; enquiry_intake is the
   * real Divine Budget customer flow. Kept on the tenant rather than the
   * conversation so a Techfind number can never accidentally file a
   * wedding enquiry, and vice versa.
   */
  @Column({
    type: 'varchar',
    length: 32,
    default: DEFAULT_TENANT_FLOW,
  })
  flow: TenantFlow;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
