import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<string, string>(); // socketId -> userId

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('register')
  async handleRegister(client: Socket, userId: string) {
    this.connectedClients.set(client.id, userId);
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
