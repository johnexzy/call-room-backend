import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class CallsEvents {
  private readonly audioStreams = new Map<string, any[]>();
  private readonly voiceDataSubject = new Subject<{
    callId: string;
    data: any;
  }>();

  onVoiceData() {
    return this.voiceDataSubject.asObservable();
  }

  emitVoiceData(callId: string, data: any) {
    if (!this.audioStreams.has(callId)) {
      this.audioStreams.set(callId, []);
    }
    this.audioStreams.get(callId).push(data);
    this.voiceDataSubject.next({ callId, data });
  }

  getAudioStream(callId: string) {
    return this.audioStreams.get(callId) || [];
  }

  clearAudioStream(callId: string) {
    this.audioStreams.delete(callId);
  }
}
