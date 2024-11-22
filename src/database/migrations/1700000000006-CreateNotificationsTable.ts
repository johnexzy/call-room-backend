import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1700000000006
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "type" character varying NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "data" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expiresAt" TIMESTAMP
      );

      CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("userId");
      CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("createdAt");
      CREATE INDEX "IDX_notifications_read" ON "notifications" ("read");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_notifications_read";
      DROP INDEX IF EXISTS "IDX_notifications_created_at";
      DROP INDEX IF EXISTS "IDX_notifications_user_id";
      DROP TABLE IF EXISTS "notifications";
    `);
  }
}
