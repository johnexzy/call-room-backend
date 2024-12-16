export const WS_NAMESPACES = {
  CALLS: 'calls',
  QUEUE: 'queue',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
  TRANSCRIPTION: 'transcription',
} as const;

export const WS_EVENTS = {
  CALLS: {
    CALL_ASSIGNED: 'call_assigned',
    CALL_ENDED: 'call_ended',
    CALL_UPDATE: 'call_update',
    QUALITY_UPDATE: 'quality_update',
  },
  QUEUE: {
    POSITION_UPDATE: 'position_update',
    QUEUE_UPDATE: 'queue_update',
    YOUR_TURN: 'your_turn',
  },
  NOTIFICATIONS: {
    NOTIFICATION: 'notification',
  },
  ANALYTICS: {
    METRICS_UPDATE: 'metrics_update',
    QUALITY_UPDATE: 'quality_update',
  },
  TRANSCRIPTION: {
    START: 'transcription:start',
    STOP: 'transcription:stop',
    AUDIO_DATA: 'transcription:audio_data',
    TRANSCRIPT: 'transcription:transcript',
    ERROR: 'transcription:error',
    COMPLETE: 'transcription:complete',
    RECONNECT: 'transcription:reconnect',
  },
} as const;

export type TranscriptionEvents = typeof WS_EVENTS.TRANSCRIPTION;
export type TranscriptionEventKeys = keyof TranscriptionEvents;
export type TranscriptionEventValues = TranscriptionEvents[TranscriptionEventKeys];
