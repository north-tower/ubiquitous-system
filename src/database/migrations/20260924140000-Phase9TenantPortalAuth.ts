import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase9TenantPortalAuth20260924140000 implements MigrationInterface {
  name = 'Phase9TenantPortalAuth20260924140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tenant_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email varchar(255) NOT NULL,
        first_name varchar(255) NOT NULL,
        last_name varchar(255) NOT NULL,
        password_hash varchar(255) NULL,
        status varchar(32) NOT NULL DEFAULT 'invited',
        invited_at timestamptz NOT NULL DEFAULT now(),
        activated_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tenant_users_email UNIQUE (email)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_tenant_users_tenant_id ON tenant_users (tenant_id)
    `);

    await queryRunner.query(`
      CREATE TABLE tenant_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_user_id uuid NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
        token_hash varchar(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        accepted_at timestamptz NULL,
        revoked_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tenant_invitations_token_hash UNIQUE (token_hash)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE tenant_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_user_id uuid NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
        token_hash varchar(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_tenant_sessions_token_hash UNIQUE (token_hash)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_invitations`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_users`);
  }
}
