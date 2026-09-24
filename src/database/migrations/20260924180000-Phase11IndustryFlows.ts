import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase11IndustryFlows20260924180000 implements MigrationInterface {
  name = 'Phase11IndustryFlows20260924180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE industry_flow_definitions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        demo_mode varchar(64) NOT NULL,
        menu_label varchar(128) NOT NULL,
        plaagg_menu_id varchar(64) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        engine_kind varchar(16) NOT NULL,
        definition jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_industry_flow_tenant_demo_mode UNIQUE (tenant_id, demo_mode),
        CONSTRAINT uq_industry_flow_tenant_plaagg_menu UNIQUE (tenant_id, plaagg_menu_id),
        CONSTRAINT chk_industry_flow_engine_kind CHECK (
          engine_kind IN ('script', 'salon', 'solar')
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_industry_flow_tenant_active
      ON industry_flow_definitions (tenant_id, is_active, sort_order)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS industry_flow_definitions`);
  }
}
