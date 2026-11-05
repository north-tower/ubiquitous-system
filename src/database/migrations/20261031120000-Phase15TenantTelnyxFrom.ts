import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase15TenantTelnyxFrom20261031120000 implements MigrationInterface {
  name = 'Phase15TenantTelnyxFrom20261031120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN telnyx_whatsapp_from varchar(32) NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_tenants_telnyx_whatsapp_from
      ON tenants (telnyx_whatsapp_from)
      WHERE telnyx_whatsapp_from IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tenants_telnyx_whatsapp_from`);
    await queryRunner.query(`
      ALTER TABLE tenants DROP COLUMN IF EXISTS telnyx_whatsapp_from
    `);
  }
}
