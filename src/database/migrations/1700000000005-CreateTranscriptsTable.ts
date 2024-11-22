import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTranscriptsTable1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "transcripts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "text" text NOT NULL,
        "speaker" character varying NOT NULL,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        "callId" uuid REFERENCES "calls"("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_transcripts_call_id" ON "transcripts" ("callId");
      CREATE INDEX "IDX_transcripts_timestamp" ON "transcripts" ("timestamp");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_transcripts_timestamp";
      DROP INDEX IF EXISTS "IDX_transcripts_call_id";
      DROP TABLE IF EXISTS "transcripts";
    `);
  }
}
