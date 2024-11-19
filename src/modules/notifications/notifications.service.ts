import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import {
  NotificationPayload,
  NotificationType,
} from './interfaces/notification.interface';

@Injectable()
export class NotificationsService {
  constructor(private notificationsGateway: NotificationsGateway) {}

  async sendQueueUpdate(
    userId: string,
    position: number,
    estimatedWaitTime: number,
  ) {
    const notification: NotificationPayload = {
      type: NotificationType.QUEUE_UPDATE,
      title: 'Queue Position Updated',
      message: `Your position in queue is ${position}`,
      data: {
        position,
        estimatedWaitTime,
      },
    };

    await this.notificationsGateway.sendNotification(userId, notification);
  }

  async sendCallReady(userId: string, representativeId: string) {
    const notification: NotificationPayload = {
      type: NotificationType.CALL_READY,
      title: 'Representative Available',
      message: "It's your turn! Connecting to representative...",
      data: {
        representativeId,
      },
    };

    await this.notificationsGateway.sendNotification(userId, notification);
  }

  async sendCallMissed(userId: string) {
    const notification: NotificationPayload = {
      type: NotificationType.CALL_MISSED,
      title: 'Missed Call',
      message: 'You missed your turn. Please rejoin the queue.',
    };

    await this.notificationsGateway.sendNotification(userId, notification);
  }

  async notifyRepresentativeAvailable(representativeId: string) {
    const notification: NotificationPayload = {
      type: NotificationType.REPRESENTATIVE_AVAILABLE,
      title: 'Representative Available',
      message: 'A new representative is available for calls',
      data: {
        representativeId,
      },
    };

    await this.notificationsGateway.broadcastToRole('customer', notification);
  }

  async sendCallbackScheduled(userId: string, scheduledTime: Date) {
    const notification: NotificationPayload = {
      type: NotificationType.CALLBACK_SCHEDULED,
      title: 'Callback Scheduled',
      message: `Your callback has been scheduled for ${scheduledTime.toLocaleString()}`,
      data: {
        scheduledTime,
      },
    };

    await this.notificationsGateway.sendNotification(userId, notification);
  }
}
