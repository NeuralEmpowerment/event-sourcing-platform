export interface SendNotificationCommand {
  memberId: string;
  type: 'OVERDUE' | 'BORROW_CONFIRMATION' | 'RETURN_CONFIRMATION';
  message: string;
  metadata?: Record<string, any>;
}
