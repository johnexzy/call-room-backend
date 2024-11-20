import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationPayload } from './interfaces/notification.interface';
import { ExtendedSocket } from '../auth/gateway.ts/auth.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WSAuthMiddleware } from '../auth/gateway.ts/auth.middleware';
import { WS_NAMESPACES } from 'src/constants/websocket.constants';

@WebSocketGateway({
  namespace: WS_NAMESPACES.NOTIFICATIONS,
  cors: {
    origin: process.env.CORS_ORIGINS || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    server.use(WSAuthMiddleware(this.jwtService, this.configService));
    const dateString = new Date().toLocaleString();
    const message = `[WebSocket] ${process.pid} - ${dateString} LOG [WebSocketServer] Websocket server successfully started`;
    this.logger.log(message);
  }

  private connectedClients: Map<string, ExtendedSocket> = new Map();
  private logger = new Logger(NotificationsGateway.name);

  handleConnection(client: ExtendedSocket) {
    const userId = client.subId;
    this.connectedClients.set(userId, client);
    this.logger.log(`Client connected: ${userId}`);
  }

  handleDisconnect(client: ExtendedSocket) {
    const userId = client.subId;
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
