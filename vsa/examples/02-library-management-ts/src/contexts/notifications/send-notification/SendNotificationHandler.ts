import { v4 as uuidv4 } from 'uuid';
import type { Command, CommandHandler } from '../../../infrastructure/CommandBus';
import type { EventStoreAdapter } from '../../../infrastructure/EventStoreAdapter';
import type { SendNotificationCommand } from './SendNotificationCommand';
import type { NotificationSentEvent } from './NotificationSentEvent';

export class SendNotificationHandler implements CommandHandler {
  constructor(private eventStore: EventStoreAdapter) {}

  async handle(command: Command): Promise<void> {
    const payload = command.payload as SendNotificationCommand;

    // Validate command
    if (!payload.memberId || !payload.type || !payload.message) {
      throw new Error('Invalid SendNotification command: missing required fields');
    }

    // Generate notification ID
    const notificationId = uuidv4();

    // Create domain event
    const event: NotificationSentEvent = {
      notificationId,
      memberId: payload.memberId,
      type: payload.type,
      message: payload.message,
      sentAt: new Date().toISOString(),
      metadata: payload.metadata,
    };

    // Append to event store
    await this.eventStore.appendEvents(notificationId, 'Notification', [
      {
        type: 'NotificationSent',
        aggregateId: notificationId,
        timestamp: new Date(),
        data: event,
      },
    ]);

    // In a real system, we would actually send the notification here
    // (email, SMS, push notification, etc.)
    console.log(`[NOTIFICATION] Sent ${payload.type} to member ${payload.memberId}: ${payload.message}`);
  }
}

