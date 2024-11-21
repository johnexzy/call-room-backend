import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserFields1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First add columns as nullable
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "firstName" character varying,
      ADD COLUMN IF NOT EXISTS "lastName" character varying,
      ADD COLUMN IF NOT EXISTS "role" character varying DEFAULT 'customer',
      ADD COLUMN IF NOT EXISTS "isAvailable" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "preferences" jsonb,
      ADD COLUMN IF NOT EXISTS "interactionHistory" jsonb,
      ADD COLUMN IF NOT EXISTS "customerValue" integer DEFAULT 0
    `);

    // Update existing records with default values
    await queryRunner.query(`
      UPDATE "users"
      SET 
        "firstName" = 'User',
        "lastName" = CONCAT('ID:', id::text)
      WHERE "firstName" IS NULL
    `);

    // Now make the columns non-nullable
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "firstName" SET NOT NULL,
      ALTER COLUMN "lastName" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "firstName",
      DROP COLUMN IF EXISTS "lastName",
      DROP COLUMN IF EXISTS "role",
      DROP COLUMN IF EXISTS "isAvailable",
      DROP COLUMN IF EXISTS "preferences",
      DROP COLUMN IF EXISTS "interactionHistory",
      DROP COLUMN IF EXISTS "customerValue"
    `);
  }
}
