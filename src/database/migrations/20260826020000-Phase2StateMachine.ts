import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2StateMachine20260826020000 implements MigrationInterface {
  name = 'Phase2StateMachine20260826020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE conversations
      ADD COLUMN demo_mode varchar(64) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE conversations
      ADD CONSTRAINT chk_conversations_current_state CHECK (
        current_state IN (
          'NEW',
          'TECHFIND_GREETING',
          'INDUSTRY_DISCOVERY',
          'DEMO_SELECTED',
          'DEMO_RUNNING',
          'DEMO_TRANSACTION',
          'VALUE_REVEAL',
          'BUSINESS_QUALIFICATION',
          'LEAD_SCORED',
          'MEETING_OFFERED',
          'MEETING_BOOKED',
          'HUMAN_HANDOFF'
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE conversations
      DROP CONSTRAINT IF EXISTS chk_conversations_current_state
    `);
    await queryRunner.query(`
      ALTER TABLE conversations
      DROP COLUMN IF EXISTS demo_mode
    `);
  }
}
