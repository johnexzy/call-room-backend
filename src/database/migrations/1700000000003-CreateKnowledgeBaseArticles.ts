import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKnowledgeBaseArticles1700000000003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "knowledge_base_articles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "content" text NOT NULL,
        "category" character varying NOT NULL,
        "tags" text[] NOT NULL DEFAULT '{}',
        "helpful" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastUpdated" TIMESTAMP NOT NULL DEFAULT now()
      );

      -- Create index for search
      CREATE INDEX IF NOT EXISTS "IDX_knowledge_base_articles_title" ON "knowledge_base_articles" ("title");
      CREATE INDEX IF NOT EXISTS "IDX_knowledge_base_articles_category" ON "knowledge_base_articles" ("category");
      
      -- Add trigger for lastUpdated
      CREATE OR REPLACE FUNCTION update_knowledge_base_articles_last_updated()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."lastUpdated" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_knowledge_base_articles_last_updated
          BEFORE UPDATE ON "knowledge_base_articles"
          FOR EACH ROW
          EXECUTE FUNCTION update_knowledge_base_articles_last_updated();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_knowledge_base_articles_last_updated ON "knowledge_base_articles";
      DROP FUNCTION IF EXISTS update_knowledge_base_articles_last_updated;
      DROP TABLE IF EXISTS "knowledge_base_articles";
    `);
  }
}
