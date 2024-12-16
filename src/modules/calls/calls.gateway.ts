import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { WS_NAMESPACES, WS_EVENTS } from '../../constants/websocket.constants';
import {
  ExtendedSocket,
  WSAuthMiddleware,
} from '../auth/gateway.ts/auth.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CallsService } from './calls.service';
import { AgoraTokenService } from './calls.events';

@WebSocketGateway({
  namespace: WS_NAMESPACES.CALLS,
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3344',
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
    @Inject(forwardRef(() => CallsService))
    private readonly callsService: CallsService,
    private readonly agoraTokenService: AgoraTokenService,
  ) {}

  afterInit(server: Server) {
    const wsAuthMiddleware = WSAuthMiddleware(
      this.jwtService,
      this.configService,
    );
    server.use(wsAuthMiddleware);

    server.on('connection_error', (err) => {
      console.error('Connection error:', err);
    });

    this.logger.log('WebSocket Server Initialized');
  }

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
    if (userId) {
      this.connectedClients.delete(userId);
      this.logger.log(`Client disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('agora-token')
  async handleAgoraToken(client: ExtendedSocket, payload: { callId: string }) {
    try {
      const uid = parseInt(client.subId, 10);
      const token = await this.agoraTokenService.generateAgoraToken(
        payload.callId,
        uid,
      );
      client.emit('agora-token', token);
    } catch (error) {
      this.logger.error('Error generating Agora token:', error);
      client.emit('error', { message: 'Failed to generate token' });
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
