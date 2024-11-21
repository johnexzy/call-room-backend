export type NotificationType =
  | 'CALL_INCOMING'
  | 'CALL_MISSED'
  | 'QUEUE_UPDATE'
  | 'FEEDBACK_RECEIVED'
  | 'SYSTEM_ALERT'
  | 'PERFORMANCE_UPDATE';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}
