import type { Command, CommandHandler } from '../../../infrastructure/CommandBus';
import type { EventStoreAdapter } from '../../../infrastructure/EventStoreAdapter';
import type { EventBus } from '../../../infrastructure/EventBus';
import type { RemoveBookCommand } from './RemoveBookCommand';
import type { BookRemovedEvent } from './BookRemovedEvent';

export class RemoveBookHandler implements CommandHandler {
  constructor(
    private eventStore: EventStoreAdapter,
    private eventBus: EventBus
  ) {}

  async handle(command: Command): Promise<void> {
    const payload = command.payload as RemoveBookCommand;

    // Validate command
    if (!payload.id || !payload.reason) {
      throw new Error('Invalid RemoveBook command: missing required fields');
    }

    // Check if book exists
    const existingEvents = await this.eventStore.readEvents(payload.id, 'Book');
    if (existingEvents.length === 0) {
      throw new Error(`Book with ID ${payload.id} not found`);
    }

    // Check if already removed
    const alreadyRemoved = existingEvents.some(e => e.type === 'BookRemoved');
    if (alreadyRemoved) {
      throw new Error(`Book with ID ${payload.id} is already removed`);
    }

    // Create domain event
    const event: BookRemovedEvent = {
      id: payload.id,
      reason: payload.reason,
      removedAt: new Date().toISOString(),
    };

    // Append to event store
    await this.eventStore.appendEvents(payload.id, 'Book', [
      {
        type: 'BookRemoved',
        aggregateId: payload.id,
        timestamp: new Date(),
        data: event,
      },
    ]);

    // Publish integration event
    await this.eventBus.publish({
      type: 'catalog.BookRemoved',
      timestamp: new Date(),
      data: event,
    });
  }
}

