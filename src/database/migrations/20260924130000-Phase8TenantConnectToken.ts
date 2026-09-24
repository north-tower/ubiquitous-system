import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase8TenantConnectToken20260924130000 implements MigrationInterface {
  name = 'Phase8TenantConnectToken20260924130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN connect_token varchar(64) NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX tenants_connect_token_key
      ON tenants (connect_token)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS tenants_connect_token_key`);
    await queryRunner.query(
      `ALTER TABLE tenants DROP COLUMN IF EXISTS connect_token`,
    );
  }
}
