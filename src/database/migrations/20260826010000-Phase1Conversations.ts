import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1Conversations20260826010000 implements MigrationInterface {
  name = 'Phase1Conversations20260826010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`DROP TABLE IF EXISTS inbound_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS raw_webhook_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS conversations`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);

    await queryRunner.query(`
      CREATE TABLE tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        whatsapp_phone_number_id varchar(64) NOT NULL,
        whatsapp_business_account_id varchar(64) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tenants_whatsapp_phone_number_id UNIQUE (whatsapp_phone_number_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        prospect_phone varchar(32) NOT NULL,
        current_state varchar(64) NOT NULL DEFAULT 'NEW',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_conversations_tenant_prospect UNIQUE (tenant_id, prospect_phone)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_conversations_tenant_id ON conversations (tenant_id)
    `);

    await queryRunner.query(`
      CREATE TABLE messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        direction varchar(8) NOT NULL,
        text text NULL,
        raw_payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_messages_conversation_id ON messages (conversation_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS conversations`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);
  }
}
