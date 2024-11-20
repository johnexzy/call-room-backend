import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: 'queue',
  cors: {
    origin: process.env.CORS_ORIGINS || 'http://localhost:3000',
    credentials: true,
  },
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
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

  async notifyQueueUpdate(
    userId: string,
    position: number,
    estimatedWaitTime: number,
  ) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit('queueUpdate', { position, estimatedWaitTime });
    }
  }

  async notifyTurn(userId: string) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit('yourTurn', {
        message: "It's your turn! Connecting to representative...",
      });
    }
  }
}
