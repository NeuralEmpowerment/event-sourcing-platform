import {
  AggregateRoot,
  Aggregate,
  EventSourcingHandler,
  CommandHandler,
} from '@event-sourcing-platform/typescript';
import { NotificationSentEvent } from './send-notification/NotificationSentEvent';
import { SendNotificationCommand } from './send-notification/SendNotificationCommand';

/** Union type of all notification events */
export type NotificationEvent = NotificationSentEvent;

export interface NotificationState {
  notificationId: string;
  memberId: string;
  type: string;
  message: string;
  sentAt: string;
  metadata?: Record<string, any>;
}

/**
 * NotificationAggregate - Manages the lifecycle of a notification
 * 
 * Following ADR-004: Command handlers integrated directly into aggregate
 */
@Aggregate('Notification')
export class NotificationAggregate extends AggregateRoot<NotificationEvent> {
  private state: NotificationState | null = null;

  get currentState(): NotificationState | null {
    return this.state;
  }

  /**
   * Send a notification - Command Handler
   */
  @CommandHandler('SendNotificationCommand')
  sendNotification(command: SendNotificationCommand): void {
    // Validation - business rules
    if (!command.memberId) {
      throw new Error('Member ID is required');
    }
    if (!command.type) {
      throw new Error('Notification type is required');
    }
    if (!command.message || command.message.trim() === '') {
      throw new Error('Message is required');
    }
    if (this.id !== null) {
      throw new Error('Notification already exists');
    }

    // Initialize aggregate (required before applying events)
    this.initialize(command.aggregateId);

    // Apply event
    const event = new NotificationSentEvent(
      command.aggregateId,
      command.memberId,
      command.type,
      command.message,
      new Date().toISOString(),
      command.metadata
    );
    this.apply(event);

    // Side effect: In a real system, we would actually send the notification here
    // (email, SMS, push notification, etc.)
    console.log(`[NOTIFICATION] Sent ${command.type} to member ${command.memberId}: ${command.message}`);
  }

  @EventSourcingHandler('NotificationSent')
  private onNotificationSent(event: NotificationSentEvent): void {
    // State update only
    this.state = {
      notificationId: event.notificationId,
      memberId: event.memberId,
      type: event.type,
      message: event.message,
      sentAt: event.sentAt,
      metadata: event.metadata,
    };
  }

  getAggregateType(): string {
    return 'Notification';
  }
}

