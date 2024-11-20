import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueEntry } from '../../entities/queue-entry.entity';
import { User } from '../../entities/user.entity';
import { Call } from '../../entities/call.entity';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { QueueGateway } from './queue.gateway';
import { CallsGateway } from '../calls/calls.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([QueueEntry, User, Call]),
    NotificationsModule,
    JwtModule,
  ],
  providers: [QueueService, QueueGateway, CallsGateway],
  controllers: [QueueController],
  exports: [QueueService],
})
export class QueueModule {}
