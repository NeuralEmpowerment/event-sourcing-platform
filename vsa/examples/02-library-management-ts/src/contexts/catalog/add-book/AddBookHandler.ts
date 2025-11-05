import type { Command, CommandHandler } from '../../../infrastructure/CommandBus';
import type { EventStoreAdapter } from '../../../infrastructure/EventStoreAdapter';
import type { EventBus } from '../../../infrastructure/EventBus';
import type { AddBookCommand } from './AddBookCommand';
import type { BookAddedEvent } from './BookAddedEvent';

export class AddBookHandler implements CommandHandler {
  constructor(
    private eventStore: EventStoreAdapter,
    private eventBus: EventBus
  ) {}

  async handle(command: Command): Promise<void> {
    const payload = command.payload as AddBookCommand;

    // Validate command
    if (!payload.id || !payload.isbn || !payload.title || !payload.author) {
      throw new Error('Invalid AddBook command: missing required fields');
    }

    if (payload.totalCopies < 1) {
      throw new Error('Total copies must be at least 1');
    }

    // Check if book already exists
    const existingEvents = await this.eventStore.readEvents(payload.id, 'Book');
    if (existingEvents.length > 0) {
      throw new Error(`Book with ID ${payload.id} already exists`);
    }

    // Create domain event
    const event: BookAddedEvent = {
      id: payload.id,
      isbn: payload.isbn,
      title: payload.title,
      author: payload.author,
      publicationYear: payload.publicationYear,
      totalCopies: payload.totalCopies,
      addedAt: new Date().toISOString(),
    };

    // Append to event store
    await this.eventStore.appendEvents(payload.id, 'Book', [
      {
        type: 'BookAdded',
        aggregateId: payload.id,
        timestamp: new Date(),
        data: event,
      },
    ]);

    // Publish integration event
    await this.eventBus.publish({
      type: 'catalog.BookAdded',
      timestamp: new Date(),
      data: event,
    });
  }
}

