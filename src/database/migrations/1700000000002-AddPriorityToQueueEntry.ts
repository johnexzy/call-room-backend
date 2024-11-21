import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityToQueueEntry1700000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "queue_entries"
      ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "estimatedHandleTime" integer,
      ADD COLUMN IF NOT EXISTS "customerValue" integer,
      ADD COLUMN IF NOT EXISTS "skillsRequired" jsonb,
      ADD COLUMN IF NOT EXISTS "preferredAgent" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "queue_entries"
      DROP COLUMN IF EXISTS "priority",
      DROP COLUMN IF EXISTS "estimatedHandleTime",
      DROP COLUMN IF EXISTS "customerValue",
      DROP COLUMN IF EXISTS "skillsRequired",
      DROP COLUMN IF EXISTS "preferredAgent"
    `);
  }
}
