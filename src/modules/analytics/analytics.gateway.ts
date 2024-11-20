import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

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
    credentials: true,
  },
})
export class AnalyticsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
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

  broadcastMetricsUpdate(metrics: MetricsUpdate) {
    this.server.emit('metrics_update', metrics);
  }

  broadcastQualityUpdate(quality: QualityUpdate) {
    this.server.emit('quality_update', quality);
  }
}
