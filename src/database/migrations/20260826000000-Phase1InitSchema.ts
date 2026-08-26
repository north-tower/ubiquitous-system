import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1InitSchema20260826000000 implements MigrationInterface {
  name = 'Phase1InitSchema20260826000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(64) NOT NULL,
        name varchar(255) NOT NULL,
        meta_phone_number_id varchar(64) NOT NULL,
        meta_waba_id varchar(64) NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tenants_slug UNIQUE (slug),
        CONSTRAINT uq_tenants_meta_phone_number_id UNIQUE (meta_phone_number_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE raw_webhook_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NULL REFERENCES tenants(id) ON DELETE SET NULL,
        meta_phone_number_id varchar(64) NULL,
        meta_waba_id varchar(64) NULL,
        object_type varchar(64) NULL,
        payload jsonb NOT NULL,
        signature_valid boolean NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_raw_webhook_events_tenant_id
      ON raw_webhook_events (tenant_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_raw_webhook_events_received_at
      ON raw_webhook_events (received_at)
    `);

    await queryRunner.query(`
      CREATE TABLE inbound_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        raw_webhook_event_id uuid NOT NULL REFERENCES raw_webhook_events(id) ON DELETE CASCADE,
        meta_message_id varchar(128) NOT NULL,
        wa_id varchar(32) NOT NULL,
        profile_name varchar(255) NULL,
        message_type varchar(64) NOT NULL,
        text_body text NULL,
        payload jsonb NOT NULL,
        meta_timestamp timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_inbound_messages_meta_message_id UNIQUE (meta_message_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inbound_messages_tenant_id
      ON inbound_messages (tenant_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inbound_messages_wa_id
      ON inbound_messages (wa_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inbound_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS raw_webhook_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);
  }
}
