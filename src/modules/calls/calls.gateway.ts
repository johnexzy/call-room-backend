import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { WS_NAMESPACES, WS_EVENTS } from '../../constants/websocket.constants';

@WebSocketGateway({
  namespace: WS_NAMESPACES.CALLS,
  cors: {
    origin: process.env.CORS_ORIGINS || 'http://localhost:3000',
    credentials: true,
  },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
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

  async notifyCallAssigned(userId: string, callData: any) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit(WS_EVENTS.CALLS.CALL_ASSIGNED, callData);
    }
  }

  async notifyCallEnded(userId: string) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit(WS_EVENTS.CALLS.CALL_ENDED);
    }
  }

  async broadcastCallUpdate() {
    this.server.emit(WS_EVENTS.CALLS.CALL_UPDATE);
  }
}
