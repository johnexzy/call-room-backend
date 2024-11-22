import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb', { nullable: true })
  queueSettings: {
    maxWaitTime: number;
    autoCallbackThreshold: number;
    priorityLevels: number;
  };

  @Column('jsonb', { nullable: true })
  callSettings: {
    maxDuration: number;
    recordCalls: boolean;
    transcriptionEnabled: boolean;
  };

  @Column('jsonb', { nullable: true })
  notificationSettings: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };

  @UpdateDateColumn()
  updatedAt: Date;
}
