import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CallsEvents {
  private readonly recordingStreams = new Map<string, any[]>();
  private readonly recordingSubject = new Subject<{
    callId: string;
    data: any;
  }>();

  constructor(private readonly configService: ConfigService) {}

  onRecordingData() {
    return this.recordingSubject.asObservable();
  }

  startRecording(callId: string) {
    if (!this.recordingStreams.has(callId)) {
      this.recordingStreams.set(callId, []);
    }
  }

  addRecordingData(callId: string, data: Blob | ArrayBuffer | any) {
    if (this.recordingStreams.has(callId)) {
      const chunks = this.recordingStreams.get(callId);
      let blob: Blob;

      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: 'audio/webm' });
      } else {
        try {
          blob = new Blob([data], { type: 'audio/webm' });
        } catch (error) {
          console.error('Failed to create blob:', error);
          return;
        }
      }

      chunks.push(blob);
      this.recordingSubject.next({ callId, data: blob });
    }
  }

  getRecordingData(callId: string) {
    return this.recordingStreams.get(callId) || [];
  }

  clearRecording(callId: string) {
    this.recordingStreams.delete(callId);
  }

  async generateAgoraToken(channelName: string, uid: number) {
    const appId = this.configService.get('AGORA_APP_ID');
    const appCertificate = this.configService.get('AGORA_APP_CERTIFICATE');
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
    );

    return {
      token,
      channel: channelName,
      uid,
    };
  }
}
