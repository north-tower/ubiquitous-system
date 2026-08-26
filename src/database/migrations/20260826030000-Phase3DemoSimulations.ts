import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3DemoSimulations20260826030000 implements MigrationInterface {
  name = 'Phase3DemoSimulations20260826030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE demo_simulations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        demo_mode varchar(64) NOT NULL,
        current_step varchar(64) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_demo_simulations_conversation_id
      ON demo_simulations (conversation_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS demo_simulations`);
  }
}
