import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6EnquiryFlow20260918120000 implements MigrationInterface {
  name = 'Phase6EnquiryFlow20260918120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN flow varchar(32) NOT NULL DEFAULT 'techfind_demo'
    `);
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD CONSTRAINT chk_tenants_flow
      CHECK (flow IN ('techfind_demo', 'enquiry_intake'))
    `);

    // Enquiry step state lives here rather than in conversations.current_state:
    // that column is a Techfind-specific FSM with a CHECK constraint and a
    // well-tested transition table, and widening it to carry a customer
    // intake flow would add migration risk for no benefit. This table
    // mirrors demo_simulations — per-conversation step + JSONB payload.
    await queryRunner.query(`
      CREATE TABLE enquiry_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        current_step varchar(64) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        submitted_at timestamptz NULL,
        reference varchar(32) NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_enquiry_sessions_conversation_id
      ON enquiry_sessions (conversation_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS enquiry_sessions`);
    await queryRunner.query(
      `ALTER TABLE tenants DROP CONSTRAINT IF EXISTS chk_tenants_flow`,
    );
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS flow`);
  }
}
