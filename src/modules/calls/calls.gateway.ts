import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WS_NAMESPACES, WS_EVENTS } from '../../constants/websocket.constants';
import { ExtendedSocket } from '../auth/gateway.ts/auth.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WSAuthMiddleware } from '../auth/gateway.ts/auth.middleware';

@WebSocketGateway({
  namespace: WS_NAMESPACES.CALLS,
  cors: {
    origin: process.env.CORS_ORIGINS || 'http://localhost:3000',
  },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
  private logger = new Logger(CallsGateway.name);

  handleConnection(client: ExtendedSocket) {
    const userId = client.subId;
    this.connectedClients.set(userId, client);
    this.logger.log(`Client connected: ${userId}`);
  }

  handleDisconnect(client: ExtendedSocket) {
    const userId = client.subId;
    this.connectedClients.delete(userId);
  }

  @SubscribeMessage('call-offer')
  async handleCallOffer(client: ExtendedSocket, payload: any) {
    const { targetUserId, offer, callId } = payload;
    const targetClient = this.connectedClients.get(targetUserId);
    if (targetClient) {
      targetClient.emit('call-offer', {
        offer,
        callId,
        fromUserId: client.subId,
      });
    }
  }

  @SubscribeMessage('call-answer')
  async handleCallAnswer(client: ExtendedSocket, payload: any) {
    const { targetUserId, answer, callId } = payload;
    const targetClient = this.connectedClients.get(targetUserId);
    if (targetClient) {
      targetClient.emit('call-answer', {
        answer,
        callId,
        fromUserId: client.subId,
      });
    }
  }

  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(client: ExtendedSocket, payload: any) {
    const { targetUserId, candidate, callId } = payload;
    const targetClient = this.connectedClients.get(targetUserId);
    if (targetClient) {
      targetClient.emit('ice-candidate', {
        candidate,
        callId,
        fromUserId: client.subId,
      });
    }
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
