import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  read: boolean;

  @Column('jsonb', { nullable: true })
  data: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
}
