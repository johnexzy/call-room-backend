import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WS_NAMESPACES, WS_EVENTS } from '../../constants/websocket.constants';
import { WSAuthMiddleware } from '../auth/gateway.ts/auth.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';

export class ExtendedSocket extends Socket {
  user: User;
  subId: string;
}

@WebSocketGateway({
  namespace: WS_NAMESPACES.QUEUE,
  cors: {
    origin: process.env.CORS_ORIGINS || 'http://localhost:3000',
  },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
  private logger = new Logger(QueueGateway.name);

  handleConnection(client: ExtendedSocket) {
    const userId = client.subId;
    this.connectedClients.set(userId, client);
    this.logger.log(`Client connected: ${userId}`);
  }

  handleDisconnect(client: ExtendedSocket) {
    const userId = client.subId;
    this.connectedClients.delete(userId);
  }

  async notifyQueueUpdate(
    userId: string,
    position: number,
    estimatedWaitTime: number,
  ) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit(WS_EVENTS.QUEUE.POSITION_UPDATE, {
        position,
        estimatedWaitTime,
      });
    }
    this.logger.log(`Queue update sent to ${userId}`);
    // Broadcast to all clients that queue has updated
    this.server.emit(WS_EVENTS.QUEUE.QUEUE_UPDATE, {
      position,
      estimatedWaitTime,
    });
  }

  async notifyTurn(userId: string) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit(WS_EVENTS.QUEUE.YOUR_TURN, {
        message: "It's your turn! Connecting to representative...",
      });
    }
    // Broadcast queue update after someone's turn
    this.server.emit(WS_EVENTS.QUEUE.QUEUE_UPDATE);
  }
}
