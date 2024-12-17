import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { WS_EVENTS, WS_NAMESPACES } from '@/constants/websocket.constants';
import { WSAuthMiddleware } from '../auth/gateway.ts/auth.middleware';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3344',
    credentials: true,
  },
  namespace: WS_NAMESPACES.TRANSCRIPTION,
})
export class TranscriptionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TranscriptionGateway.name);
  private readonly activeConnections = new Map<string, Socket>();

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

  async handleConnection(client: Socket) {
    const sessionId = client.handshake.query.sessionId as string;
    if (!sessionId) {
      client.disconnect();
      return;
    }

    this.activeConnections.set(sessionId, client);
    this.logger.log(`Client connected: ${sessionId}`);

    try {
      const transcriptionSubject =
        await this.transcriptionService.startStreamingRecognition(sessionId);
      transcriptionSubject.subscribe({
        next: (transcript) => {
          client.emit(WS_EVENTS.TRANSCRIPTION.TRANSCRIPT, { transcript });
        },
        error: (error) => {
          client.emit(WS_EVENTS.TRANSCRIPTION.ERROR, { error: error.message });
        },
        complete: () => {
          client.emit(WS_EVENTS.TRANSCRIPTION.COMPLETE);
        },
      });
    } catch (error) {
      this.logger.error(`Error starting transcription: ${error.message}`);
      client.emit(WS_EVENTS.TRANSCRIPTION.ERROR, { error: error.message });
    }
  }

  async handleDisconnect(client: Socket) {
    const sessionId = client.handshake.query.sessionId as string;
    if (sessionId) {
      try {
        await this.transcriptionService.stopStreamingRecognition(sessionId);
        this.activeConnections.delete(sessionId);
        this.logger.log(`Client disconnected and cleaned up: ${sessionId}`);
      } catch (error) {
        this.logger.error(`Error during disconnect cleanup: ${error.message}`);
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.TRANSCRIPTION.AUDIO_DATA)
  async handleAudioData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audioData: string },
  ) {
    const sessionId = client.handshake.query.sessionId as string;
    if (!sessionId) {
      return;
    }

    try {
      await this.transcriptionService.processAudioChunk(
        sessionId,
        data.audioData,
      );
    } catch (error) {
      this.logger.error(`Error processing audio data: ${error.message}`);
      client.emit(WS_EVENTS.TRANSCRIPTION.ERROR, { error: error.message });
    }
  }
}
