import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from './interfaces/notification.interface';

@Injectable()
export class NotificationsService {
  constructor(private notificationsGateway: NotificationsGateway) {}

  async notifyCallReady(userId: string) {
    await this.notificationsGateway.sendNotification(userId, {
      type: NotificationType.CALL_READY,
      title: 'Call Ready',
      message: 'Your call is ready. Connecting you with a representative...',
    });
  }

  async notifyCallMissed(userId: string) {
    await this.notificationsGateway.sendNotification(userId, {
      type: NotificationType.CALL_MISSED,
      title: 'Call Missed',
      message: 'You missed your call. Please rejoin the queue.',
    });
  }

  async notifyRepresentativeAvailable(userId: string) {
    await this.notificationsGateway.sendNotification(userId, {
      type: NotificationType.REPRESENTATIVE_AVAILABLE,
      title: 'Representative Available',
      message: 'A representative is now available to take your call.',
    });
  }

  async notifyQueuePosition(
    userId: string,
    position: number,
    waitTime: number,
  ) {
    await this.notificationsGateway.sendNotification(userId, {
      type: NotificationType.QUEUE_UPDATE,
      title: 'Queue Update',
      message: `Your position in queue: ${position}. Estimated wait time: ${waitTime} minutes`,
      data: { position, waitTime },
    });
  }
}
