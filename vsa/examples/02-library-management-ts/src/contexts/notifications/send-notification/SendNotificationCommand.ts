/**
 * Command to send a notification to a member
 */
export class SendNotificationCommand {
  constructor(
    public readonly aggregateId: string, // notification ID
    public readonly memberId: string,
    public readonly type: 'OVERDUE' | 'BORROW_CONFIRMATION' | 'RETURN_CONFIRMATION',
    public readonly message: string,
    public readonly metadata?: Record<string, any>
  ) {}
}
