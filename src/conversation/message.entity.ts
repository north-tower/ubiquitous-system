import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type MessageDirection = 'in' | 'out';

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ type: 'varchar', length: 8 })
  direction: MessageDirection;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ name: 'raw_payload', type: 'jsonb' })
  rawPayload: unknown;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
