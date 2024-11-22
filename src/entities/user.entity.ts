import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { QueueEntry } from './queue-entry.entity';
import { Call } from './call.entity';
import { Notification } from './notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: ['customer', 'representative', 'admin'],
    default: 'customer',
  })
  role: string;

  @Column({ default: false })
  isAvailable: boolean;

  @Column('jsonb', { nullable: true })
  preferences: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  interactionHistory: Array<{
    timestamp: Date;
    type: string;
    details: string;
    satisfaction?: number;
  }>;

  @Column({ type: 'int', default: 0 })
  customerValue: number;

  @OneToMany(() => QueueEntry, (queueEntry) => queueEntry.user)
  queueEntries: QueueEntry[];

  @OneToMany(() => Call, (call) => call.customer)
  customerCalls: Call[];

  @OneToMany(() => Call, (call) => call.representative)
  representativeCalls: Call[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
