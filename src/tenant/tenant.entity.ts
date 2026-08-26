import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
