import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { Call } from '../../entities/call.entity';
import { QueueEntry } from '../../entities/queue-entry.entity';
import { Feedback } from '../../entities/feedback.entity';
import { UserSeeder } from './user.seeder';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Call, QueueEntry, Feedback],
      synchronize: true,
      dropSchema: true,
      logging: true,
    }),
    TypeOrmModule.forFeature([User, Call, QueueEntry, Feedback]),
  ],
  providers: [UserSeeder],
})
export class SeederModule {}
