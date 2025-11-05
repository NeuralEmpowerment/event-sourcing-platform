import { v4 as uuidv4 } from 'uuid';
import type { Command, CommandHandler } from '../../../infrastructure/CommandBus';
import type { EventStoreAdapter } from '../../../infrastructure/EventStoreAdapter';
import type { EventBus } from '../../../infrastructure/EventBus';
import type { BorrowBookCommand } from './BorrowBookCommand';
import type { BookBorrowedEvent } from './BookBorrowedEvent';

export class BorrowBookHandler implements CommandHandler {
  constructor(
    private eventStore: EventStoreAdapter,
    private eventBus: EventBus
  ) {}

  async handle(command: Command): Promise<void> {
    const payload = command.payload as BorrowBookCommand;

    // Validate command
    if (!payload.bookId || !payload.memberId || !payload.dueDate) {
      throw new Error('Invalid BorrowBook command: missing required fields');
    }

    // Validate due date is in the future
    const dueDate = new Date(payload.dueDate);
    if (dueDate <= new Date()) {
      throw new Error('Due date must be in the future');
    }

    // Generate loan ID
    const loanId = uuidv4();

    // Create domain event
    const event: BookBorrowedEvent = {
      loanId,
      bookId: payload.bookId,
      memberId: payload.memberId,
      borrowedAt: new Date().toISOString(),
      dueDate: payload.dueDate,
    };

    // Append to event store
    await this.eventStore.appendEvents(loanId, 'Loan', [
      {
        type: 'BookBorrowed',
        aggregateId: loanId,
        timestamp: new Date(),
        data: event,
      },
    ]);

    // Publish integration event
    await this.eventBus.publish({
      type: 'lending.BookBorrowed',
      timestamp: new Date(),
      data: event,
    });
  }
}

