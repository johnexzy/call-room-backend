import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { QueueModule } from '../queue/queue.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [forwardRef(() => QueueModule), JwtModule],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
