import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5LeadProfiles20260826050000 implements MigrationInterface {
  name = 'Phase5LeadProfiles20260826050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE lead_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        business_name varchar(255) NULL,
        daily_enquiry_volume integer NULL,
        current_process text NULL,
        staff_count integer NULL,
        existing_system text NULL,
        pain_point text NULL,
        requested_features jsonb NOT NULL DEFAULT '[]'::jsonb,
        conversation_summary text NULL,
        lead_score varchar(8) NULL,
        next_action text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_lead_profiles_conversation_id UNIQUE (conversation_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lead_profiles`);
  }
}
