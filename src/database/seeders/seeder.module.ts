import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  User,
  Call,
  QueueEntry,
  Feedback,
  Settings,
  Transcript,
  CustomerJourney,
  Notification,
} from '../../entities';
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
      entities: [
        User,
        Call,
        QueueEntry,
        Feedback,
        Settings,
        Transcript,
        CustomerJourney,
        Notification,
      ],
      synchronize: true,
      dropSchema: true,
      logging: true,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    }),
    TypeOrmModule.forFeature([
      User,
      Call,
      QueueEntry,
      Feedback,
      Settings,
      CustomerJourney,
      Transcript,
      Notification,
    ]),
  ],
  providers: [UserSeeder],
})
export class SeederModule {}
