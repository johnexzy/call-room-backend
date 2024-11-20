export enum NotificationType {
  CALL_READY = 'call_ready',
  CALL_MISSED = 'call_missed',
  QUEUE_UPDATE = 'queue_update',
  REPRESENTATIVE_AVAILABLE = 'representative_available',
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}
