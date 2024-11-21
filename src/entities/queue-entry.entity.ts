import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('queue_entries')
export class QueueEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.queueEntries)
  user: User;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: 0 })
  position: number;

  @Column({ default: false })
  isCallback: boolean;

  @Column({ nullable: true })
  callbackPhone: string;

  @Column({
    type: 'enum',
    enum: ['waiting', 'connected', 'completed', 'cancelled'],
    default: 'waiting',
  })
  status: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'int', nullable: true })
  estimatedHandleTime: number;

  @Column({ type: 'int', nullable: true })
  customerValue: number;

  @Column('jsonb', { nullable: true })
  skillsRequired: string[];

  @Column({ type: 'uuid', nullable: true })
  preferredAgent: string;
}
