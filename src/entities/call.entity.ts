import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Feedback } from './feedback.entity';
import { Transcript } from './transcript.entity';

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
    enum: ['active', 'completed', 'missed', 'cancelled'],
    default: 'active',
  })
  status: string;

  @Column('jsonb', { nullable: true })
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

  @Column('text', { nullable: true })
  notes: string;

  @OneToMany(() => Feedback, (feedback) => feedback.call)
  feedback: Feedback[];

  @OneToMany(() => Transcript, (transcript) => transcript.call)
  transcripts: Transcript[];

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: ['not_started', 'recording', 'completed', 'failed'],
    default: 'not_started',
  })
  recordingStatus: string;

  @Column({ nullable: true })
  recordingUrl: string;

  // Utility methods
  calculateDuration(): number {
    if (!this.endTime) return 0;
    return (this.endTime.getTime() - this.startTime.getTime()) / 1000;
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  canBeRated(): boolean {
    return this.status === 'completed' && !this.feedback?.length;
  }

  updateQualityMetrics(metrics: Partial<Call['qualityMetrics']>) {
    this.qualityMetrics = {
      ...this.qualityMetrics,
      ...metrics,
    };
  }
}
