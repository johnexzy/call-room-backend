import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoriesToFeedback1700000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Add missing columns first
      ALTER TABLE "feedback"
      ADD COLUMN IF NOT EXISTS "userId" uuid,
      ADD COLUMN IF NOT EXISTS "callId" uuid,
      ADD COLUMN IF NOT EXISTS "categories" text[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "metrics" jsonb DEFAULT '{}';

      -- Add foreign key constraints
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_feedback_call_id'
        ) THEN
          ALTER TABLE "feedback"
          ADD CONSTRAINT "FK_feedback_call_id"
          FOREIGN KEY ("callId")
          REFERENCES "calls"("id")
          ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_feedback_user_id'
        ) THEN
          ALTER TABLE "feedback"
          ADD CONSTRAINT "FK_feedback_user_id"
          FOREIGN KEY ("userId")
          REFERENCES "users"("id")
          ON DELETE CASCADE;
        END IF;
      END $$;

      -- Add indexes for foreign keys
      CREATE INDEX IF NOT EXISTS "IDX_feedback_user_id" ON "feedback" ("userId");
      CREATE INDEX IF NOT EXISTS "IDX_feedback_call_id" ON "feedback" ("callId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_feedback_user_id";
      DROP INDEX IF EXISTS "IDX_feedback_call_id";

      ALTER TABLE "feedback"
      DROP CONSTRAINT IF EXISTS "FK_feedback_call_id",
      DROP CONSTRAINT IF EXISTS "FK_feedback_user_id";

      ALTER TABLE "feedback"
      DROP COLUMN IF EXISTS "userId",
      DROP COLUMN IF EXISTS "callId",
      DROP COLUMN IF EXISTS "categories",
      DROP COLUMN IF EXISTS "metrics";
    `);
  }
}
