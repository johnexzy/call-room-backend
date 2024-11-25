import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRecordingFieldsToCalls1710000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('calls');

    // Check if recordingStatus column exists
    if (!table.findColumnByName('recordingStatus')) {
      await queryRunner.addColumn(
        'calls',
        new TableColumn({
          name: 'recordingStatus',
          type: 'enum',
          enum: ['not_started', 'recording', 'completed', 'failed'],
          default: "'not_started'",
        }),
      );
    }

    // Check if recordingUrl column exists
    if (!table.findColumnByName('recordingUrl')) {
      await queryRunner.addColumn(
        'calls',
        new TableColumn({
          name: 'recordingUrl',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('calls');

    if (table.findColumnByName('recordingStatus')) {
      await queryRunner.dropColumn('calls', 'recordingStatus');
    }

    if (table.findColumnByName('recordingUrl')) {
      await queryRunner.dropColumn('calls', 'recordingUrl');
    }
  }
}
