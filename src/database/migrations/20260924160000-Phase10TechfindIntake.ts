import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase10TechfindIntake20260924160000 implements MigrationInterface {
  name = 'Phase10TechfindIntake20260924160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE techfind_intake_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        current_step varchar(64) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_techfind_intake_sessions_conversation
      ON techfind_intake_sessions (conversation_id, created_at DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE lead_profiles
      ADD COLUMN contact_name varchar(255) NULL,
      ADD COLUMN service_required varchar(64) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE lead_profiles
      DROP COLUMN IF EXISTS service_required,
      DROP COLUMN IF EXISTS contact_name
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS techfind_intake_sessions`);
  }
}
