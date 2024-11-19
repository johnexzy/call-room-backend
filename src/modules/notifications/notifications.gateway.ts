import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { NotificationPayload } from './interfaces/notification.interface';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();

  @UseGuards(WsJwtGuard)
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.connectedClients.set(userId, client);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.connectedClients.delete(userId);
  }

  async sendNotification(userId: string, notification: NotificationPayload) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit('notification', notification);
    }
  }

  async broadcastToRole(role: string, notification: NotificationPayload) {
    this.server.emit(`role:${role}`, notification);
  }
}
