import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Call } from './call.entity';
import { QueueEntry } from './queue-entry.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
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
