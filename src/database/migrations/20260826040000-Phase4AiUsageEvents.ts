import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4AiUsageEvents20260826040000 implements MigrationInterface {
  name = 'Phase4AiUsageEvents20260826040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ai_usage_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        conversation_id uuid NOT NULL,
        provider varchar(32) NOT NULL,
        model varchar(64) NOT NULL,
        input_tokens integer NOT NULL,
        output_tokens integer NOT NULL,
        estimated_cost_usd double precision NOT NULL,
        purpose varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ai_usage_events_conversation_id
      ON ai_usage_events (conversation_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ai_usage_events`);
  }
}
