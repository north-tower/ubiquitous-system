import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase13TenantPrimaryChannel20261009120000 implements MigrationInterface {
  name = 'Phase13TenantPrimaryChannel20261009120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN primary_channel varchar(16) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE tenants DROP COLUMN IF EXISTS primary_channel`,
    );
  }
}
