import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Call } from '../../entities/call.entity';
import { Feedback } from '../../entities/feedback.entity';
import { User } from '../../entities/user.entity';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { UsersModule } from '../users/users.module';
import { QueueModule } from '../queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, Feedback, User]),
    UsersModule,
    QueueModule,
    NotificationsModule,
  ],
  providers: [CallsService],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
