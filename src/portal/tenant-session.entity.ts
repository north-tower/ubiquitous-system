import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantUser } from './tenant-user.entity';

@Entity({ name: 'tenant_sessions' })
export class TenantSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_user_id', type: 'uuid' })
  tenantUserId: string;

  @ManyToOne(() => TenantUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser: TenantUser;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
