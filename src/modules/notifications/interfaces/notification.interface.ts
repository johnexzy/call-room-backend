export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export enum NotificationType {
  QUEUE_UPDATE = 'queue_update',
  CALL_READY = 'call_ready',
  CALL_MISSED = 'call_missed',
  REPRESENTATIVE_AVAILABLE = 'representative_available',
  CALLBACK_SCHEDULED = 'callback_scheduled',
}
