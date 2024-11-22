import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('transcripts')
export class Transcript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Call, (call) => call.transcripts)
  call: Call;

  @Column('text')
  text: string;

  @Column()
  speaker: string;

  @CreateDateColumn()
  timestamp: Date;
}
