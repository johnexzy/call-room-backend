import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Call } from '../../calls/entities/call.entity';
import { QueueEntry } from '../../queue/entities/queue-entry.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: ['customer', 'representative', 'admin'],
    default: 'customer',
  })
  role: string;

  @Column({ default: false })
  isAvailable: boolean;

  @OneToMany(() => Call, (call) => call.customer)
  customerCalls: Call[];

  @OneToMany(() => Call, (call) => call.representative)
  representativeCalls: Call[];

  @OneToMany(() => QueueEntry, (queueEntry) => queueEntry.user)
  queueEntries: QueueEntry[];
}
