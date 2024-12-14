import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAIFieldsToCalls1710000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('calls');

    // Add aiSummary column
    if (!table.findColumnByName('aiSummary')) {
      await queryRunner.addColumn(
        'calls',
        new TableColumn({
          name: 'aiSummary',
          type: 'jsonb',
          isNullable: true,
        }),
      );
    }

    // Add aiNextSteps column
    if (!table.findColumnByName('aiNextSteps')) {
      await queryRunner.addColumn(
        'calls',
        new TableColumn({
          name: 'aiNextSteps',
          type: 'jsonb',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('calls');

    if (table.findColumnByName('aiSummary')) {
      await queryRunner.dropColumn('calls', 'aiSummary');
    }

    if (table.findColumnByName('aiNextSteps')) {
      await queryRunner.dropColumn('calls', 'aiNextSteps');
    }
  }
}
