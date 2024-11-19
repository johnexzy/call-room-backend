import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueEntry } from './entities/queue-entry.entity';
import { QueueService } from './queue.service';
import { QueueGateway } from './queue.gateway';
import { QueueController } from './queue.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([QueueEntry]),
    forwardRef(() => NotificationsModule),
    JwtModule,
  ],
  providers: [QueueService, QueueGateway],
  controllers: [QueueController],
  exports: [QueueService],
})
export class QueueModule {}
