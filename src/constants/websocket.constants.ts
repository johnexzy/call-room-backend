export const WS_NAMESPACES = {
  CALLS: 'calls',
  QUEUE: 'queue',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
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
} as const;
