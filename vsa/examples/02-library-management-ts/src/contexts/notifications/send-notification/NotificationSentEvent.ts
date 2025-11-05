export interface NotificationSentEvent {
  notificationId: string;
  memberId: string;
  type: string;
  message: string;
  sentAt: string;
  metadata?: Record<string, any>;
}

