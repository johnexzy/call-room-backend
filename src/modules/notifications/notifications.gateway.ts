import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import {
  ExtendedSocket,
  WSAuthMiddleware,
} from '../auth/gateway.ts/auth.middleware';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WS_NAMESPACES } from '@/constants/websocket.constants';

@WebSocketGateway({
  namespace: WS_NAMESPACES.NOTIFICATIONS,
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3344',
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

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<string, ExtendedSocket>(); // socketId -> userId

  handleConnection(client: ExtendedSocket) {
    try {
      const userId = client.subId;
      if (userId) {
        this.connectedClients.set(userId, client);
        this.logger.log(`Client connected: ${userId}`);
        client.join(`user:${userId}`);
      }
    } catch (error) {
      this.logger.error('Error handling connection:', error);
    }
  }

  handleDisconnect(client: ExtendedSocket) {
    const userId = client.subId;
    this.connectedClients.delete(userId);
  }

  @SubscribeMessage('register')
  async handleRegister(client: ExtendedSocket, userId: string) {
    this.connectedClients.set(client.id, client);
    client.join(`user:${userId}`);
    this.logger.log(`User ${userId} registered to socket ${client.id}`);
  }

  @SubscribeMessage('joinQueue')
  async handleJoinQueue(client: Socket, queueId: string) {
    client.join(`queue:${queueId}`);
    this.logger.log(`Socket ${client.id} joined queue ${queueId}`);
  }

  @SubscribeMessage('joinAgentRoom')
  async handleJoinAgentRoom(client: Socket, agentId: string) {
    client.join(`agent:${agentId}`);
    this.logger.log(`Agent ${agentId} joined agent room`);
  }
}
