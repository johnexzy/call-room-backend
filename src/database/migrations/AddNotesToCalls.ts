import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNotesToCalls1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('calls');

    if (!table.findColumnByName('notes')) {
      await queryRunner.addColumn(
        'calls',
        new TableColumn({
          name: 'notes',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('calls');

    if (table.findColumnByName('notes')) {
      await queryRunner.dropColumn('calls', 'notes');
    }
  }
}
