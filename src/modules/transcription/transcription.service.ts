import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { ConfigService } from '@nestjs/config';

interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: Date;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly transcriptionSessions: Map<string, WebSocket> = new Map();
  private readonly transcripts: Map<string, TranscriptionResult[]> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async startTranscription(callId: string): Promise<void> {
    try {
      // Initialize transcript storage
      this.transcripts.set(callId, []);

      // Example implementation using a WebSocket connection to a transcription service
      const ws = new WebSocket(
        this.configService.get('TRANSCRIPTION_SERVICE_URL'),
      );

      ws.on('message', (data: string) => {
        const result = JSON.parse(data) as TranscriptionResult;
        const currentTranscript = this.transcripts.get(callId) || [];
        currentTranscript.push(result);
        this.transcripts.set(callId, currentTranscript);
      });

      ws.on('error', (error) => {
        this.logger.error(`Transcription error for call ${callId}:`, error);
      });

      this.transcriptionSessions.set(callId, ws);
    } catch (error) {
      this.logger.error(
        `Failed to start transcription for call ${callId}:`,
        error,
      );
      throw error;
    }
  }

  async stopTranscription(callId: string): Promise<void> {
    try {
      const session = this.transcriptionSessions.get(callId);
      if (session) {
        session.close();
        this.transcriptionSessions.delete(callId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to stop transcription for call ${callId}:`,
        error,
      );
      throw error;
    }
  }

  async getTranscript(callId: string): Promise<TranscriptionResult[]> {
    const transcript = this.transcripts.get(callId);
    if (!transcript) {
      throw new Error(`No transcript found for call ${callId}`);
    }
    return transcript;
  }
}
