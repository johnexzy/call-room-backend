import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Feedback } from './feedback.entity';

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.customerCalls)
  customer: User;

  @ManyToOne(() => User, (user) => user.representativeCalls)
  representative: User;

  @CreateDateColumn()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'missed'],
    default: 'active',
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  qualityMetrics: {
    audioQuality: {
      packetLoss: number;
      jitter: number;
      latency: number;
    };
    networkMetrics: {
      bandwidth: number;
      roundTripTime: number;
    };
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => Feedback, (feedback) => feedback.call)
  feedback: Feedback[];

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'interval', nullable: true })
  duration?: string;
}
