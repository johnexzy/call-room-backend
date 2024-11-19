import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('queue_entries')
export class QueueEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.queueEntries)
  user: User;

  @CreateDateColumn()
  joinedAt: Date;

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
}
