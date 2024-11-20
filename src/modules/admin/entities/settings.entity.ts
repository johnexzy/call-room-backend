import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 50 })
  maxQueueSize: number;

  @Column({ type: 'int', default: 30 })
  maxWaitTime: number;

  @Column({ default: true })
  enableCallbacks: boolean;

  @Column({ default: true })
  enableAutoAssignment: boolean;

  @Column({ type: 'time', default: '09:00' })
  workingHoursStart: string;

  @Column({ type: 'time', default: '17:00' })
  workingHoursEnd: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
