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
import {
  ExtendedSocket,
  WSAuthMiddleware,
} from '../auth/gateway.ts/auth.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CallsEvents } from './calls.events';

@WebSocketGateway({
  namespace: WS_NAMESPACES.CALLS,
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly connectedClients: Map<string, ExtendedSocket> = new Map();
  private readonly logger = new Logger(CallsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly callsEvents: CallsEvents,
  ) {}

  afterInit(server: Server) {
    const wsAuthMiddleware = WSAuthMiddleware(
      this.jwtService,
      this.configService,
    );
    const dateString = new Date().toLocaleString();
    const message = `[WebSocket] ${process.pid} - ${dateString} LOG [WebSocketServer] Websocket server successfully started`;
    this.logger.log(message);
    server.use(wsAuthMiddleware);
  }

  handleConnection(client: ExtendedSocket) {
    const userId = client.subId;
    if (userId) {
      this.connectedClients.set(userId, client);
      this.logger.log(`Client connected: ${userId}`);
      client.join(`user:${userId}`);
    }
  }

  handleDisconnect(client: ExtendedSocket) {
    const userId = client.subId;
    if (userId) {
      this.connectedClients.delete(userId);
      this.logger.log(`Client disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('voiceData')
  handleVoiceData(
    client: ExtendedSocket,
    payload: { callId: string; data: any },
  ) {
    this.logger.log(`Received voice data for call ${payload.callId}`);
    this.callsEvents.emitVoiceData(payload.callId, payload.data);
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

  notifyCallAssigned(userId: string, callData: any) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit(WS_EVENTS.CALLS.CALL_ASSIGNED, callData);
    }
  }

  notifyCallEnded(userId: string) {
    const client = this.connectedClients.get(userId);
    if (client) {
      client.emit(WS_EVENTS.CALLS.CALL_ENDED);
    }
  }

  notifyCallEndedByAdmin(
    callId: string,
    data: {
      customerId: string;
      representativeId: string;
      reason: string;
    },
  ) {
    const customerClient = this.connectedClients.get(data.customerId);
    const representativeClient = this.connectedClients.get(
      data.representativeId,
    );

    const callEndedData = {
      callId,
      reason: data.reason,
    };

    if (customerClient) {
      customerClient.emit('call_ended', callEndedData);
    }

    if (representativeClient) {
      representativeClient.emit('call_ended', callEndedData);
    }

    this.server.to('role:admin').emit('call_ended', callEndedData);
  }

  broadcastCallUpdate() {
    this.server.emit(WS_EVENTS.CALLS.CALL_UPDATE);
  }
}
