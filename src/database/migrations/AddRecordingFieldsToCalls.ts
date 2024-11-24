import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRecordingFieldsToCalls1710000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('calls', [
      new TableColumn({
        name: 'recordingStatus',
        type: 'enum',
        enum: ['not_started', 'recording', 'completed', 'failed'],
        default: "'not_started'",
      }),
      new TableColumn({
        name: 'recordingUrl',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('calls', 'recordingStatus');
    await queryRunner.dropColumn('calls', 'recordingUrl');
  }
}
