import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase12PosOpsFlow20260928120000 implements MigrationInterface {
  name = 'Phase12PosOpsFlow20260928120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      DROP CONSTRAINT IF EXISTS chk_tenants_flow
    `);
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD CONSTRAINT chk_tenants_flow
      CHECK (flow IN ('techfind_demo', 'enquiry_intake', 'pos_ops'))
    `);

    await queryRunner.query(`
      CREATE TABLE pos_ops_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        current_step varchar(64) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        closed_at timestamptz NULL,
        reference varchar(64) NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_pos_ops_sessions_conversation_id
      ON pos_ops_sessions (conversation_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pos_ops_sessions`);
    await queryRunner.query(`
      ALTER TABLE tenants
      DROP CONSTRAINT IF EXISTS chk_tenants_flow
    `);
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD CONSTRAINT chk_tenants_flow
      CHECK (flow IN ('techfind_demo', 'enquiry_intake'))
    `);
  }
}
