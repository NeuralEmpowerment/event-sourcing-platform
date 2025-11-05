import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

export class NotificationSentEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'NotificationSent';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly notificationId: string,
    public readonly memberId: string,
    public readonly type: string,
    public readonly message: string,
    public readonly sentAt: string = new Date().toISOString(),
    public readonly metadata?: Record<string, any>
  ) {
    super();
  }
}

