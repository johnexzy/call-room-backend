import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from './interfaces/notification.interface';
import { Notification } from '@/entities';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class NotificationsService {
  @WebSocketServer()
  private server: Server;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async sendNotification(
    userId: string,
    notification: {
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    },
  ) {
    // Store notification in database
    const newNotification = this.notificationRepository.create({
      user: { id: userId },
      ...notification,
    });
    await this.notificationRepository.save(newNotification);

    // Send real-time notification
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  async sendQueueUpdate(
    queueId: string,
    update: {
      waitTime: number;
      position: number;
      status: string;
    },
  ) {
    this.server.to(`queue:${queueId}`).emit('queueUpdate', update);
  }

  async sendCallAlert(
    agentId: string,
    alert: {
      type: 'incoming' | 'missed' | 'ended';
      callId: string;
      customerName: string;
      priority: number;
    },
  ) {
    // Store call alert as notification
    await this.sendNotification(agentId, {
      type: `CALL_${alert.type.toUpperCase()}` as NotificationType,
      title: `Call ${alert.type}`,
      message: `Call from ${alert.customerName}`,
      data: { callId: alert.callId, priority: alert.priority },
    });

    // Send real-time alert
    this.server.to(`agent:${agentId}`).emit('callAlert', alert);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, { read: true });
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationRepository.delete(notificationId);
  }
}
