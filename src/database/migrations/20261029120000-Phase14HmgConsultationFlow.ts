import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase14HmgConsultationFlow20261029120000 implements MigrationInterface {
  name = 'Phase14HmgConsultationFlow20261029120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      DROP CONSTRAINT IF EXISTS chk_tenants_flow
    `);
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD CONSTRAINT chk_tenants_flow
      CHECK (flow IN ('techfind_demo', 'enquiry_intake', 'pos_ops', 'hmg_consultation'))
    `);

    await queryRunner.query(`
      CREATE TABLE hmg_sessions (
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
      CREATE INDEX idx_hmg_sessions_conversation_id
      ON hmg_sessions (conversation_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hmg_sessions`);
    await queryRunner.query(`
      ALTER TABLE tenants
      DROP CONSTRAINT IF EXISTS chk_tenants_flow
    `);
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD CONSTRAINT chk_tenants_flow
      CHECK (flow IN ('techfind_demo', 'enquiry_intake', 'pos_ops'))
    `);
  }
}
