import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ExtendedSocket,
  WSAuthMiddleware,
} from '../auth/gateway.ts/auth.middleware';
import { Logger } from '@nestjs/common';

interface MetricsUpdate {
  totalCalls: number;
  missedCalls: number;
  averageRating: number;
  averageCallDuration: number;
}

interface QualityUpdate {
  audioQuality: {
    packetLoss: number;
    jitter: number;
    latency: number;
  };
  networkMetrics: {
    bandwidth: number;
    roundTripTime: number;
  };
}

@WebSocketGateway({
  namespace: 'analytics',
  cors: {
    origin: process.env.CORS_ORIGINS || 'http://localhost:3000',
  },
})
export class AnalyticsGateway
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
  private logger = new Logger(AnalyticsGateway.name);

  handleConnection(client: ExtendedSocket) {
    const userId = client.subId;
    this.connectedClients.set(userId, client);
    this.logger.log(`Client connected: ${userId}`);
  }

  handleDisconnect(client: ExtendedSocket) {
    const userId = client.subId;
    this.connectedClients.delete(userId);
  }

  broadcastMetricsUpdate(metrics: MetricsUpdate) {
    this.server.emit('metrics_update', metrics);
  }

  broadcastQualityUpdate(quality: QualityUpdate) {
    this.server.emit('quality_update', quality);
  }
}
