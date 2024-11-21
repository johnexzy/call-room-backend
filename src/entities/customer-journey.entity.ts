import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('customer_journey')
export class CustomerJourney {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column('jsonb')
  touchpoints: Array<{
    timestamp: Date;
    channel: string;
    interaction: string;
    outcome: string;
    agentId?: string;
    satisfaction?: number;
  }>;

  @Column('jsonb')
  metrics: {
    lifetimeValue: number;
    interactionCount: number;
    averageSatisfaction: number;
    issueResolutionRate: number;
  };
}
