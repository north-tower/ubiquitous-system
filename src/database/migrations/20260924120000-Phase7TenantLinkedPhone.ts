import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase7TenantLinkedPhone20260924120000 implements MigrationInterface {
  name = 'Phase7TenantLinkedPhone20260924120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
      ADD COLUMN linked_phone varchar(32) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE tenants DROP COLUMN IF EXISTS linked_phone`,
    );
  }
}
