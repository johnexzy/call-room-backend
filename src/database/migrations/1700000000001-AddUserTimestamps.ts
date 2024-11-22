import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTimestamps1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add timestamp columns
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // Add trigger to automatically update updatedAt
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
      CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON "users"
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
    `);

    // Remove function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column;
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "createdAt",
      DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}
