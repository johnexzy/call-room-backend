import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Call } from './call.entity';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Call, (call) => call.feedback)
  call: Call;

  @Column('int')
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @Column('jsonb', { nullable: true })
  categories: string[];

  @CreateDateColumn()
  createdAt: Date;

  @Column('jsonb', { nullable: true })
  metrics: {
    audioQuality?: number;
    connectionQuality?: number;
    agentKnowledge?: number;
    resolution?: number;
  };
}
