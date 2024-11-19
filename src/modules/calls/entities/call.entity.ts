import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
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

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => Feedback, (feedback) => feedback.call)
  feedback: Feedback[];

  @Column('jsonb', { nullable: true })
  qualityMetrics: {
    audioQuality: {
      packetLoss: number;
      jitter: number;
      latency: number;
    };
    videoQuality: {
      frameRate: number;
      resolution: string;
      bitrate: number;
    };
    networkMetrics: {
      bandwidth: number;
      roundTripTime: number;
    };
  };
}
