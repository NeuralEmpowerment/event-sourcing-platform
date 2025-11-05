import type { Command, CommandHandler } from '../../../infrastructure/CommandBus';
import type { EventStoreAdapter } from '../../../infrastructure/EventStoreAdapter';
import type { EventBus } from '../../../infrastructure/EventBus';
import type { MarkOverdueCommand } from './MarkOverdueCommand';
import type { BookOverdueEvent } from './BookOverdueEvent';

export class MarkOverdueHandler implements CommandHandler {
  constructor(
    private eventStore: EventStoreAdapter,
    private eventBus: EventBus
  ) {}

  async handle(command: Command): Promise<void> {
    const payload = command.payload as MarkOverdueCommand;

    // Validate command
    if (!payload.loanId || payload.daysPastDue < 1) {
      throw new Error('Invalid MarkOverdue command: missing or invalid fields');
    }

    // Load loan events
    const loanEvents = await this.eventStore.readEvents(payload.loanId, 'Loan');
    if (loanEvents.length === 0) {
      throw new Error(`Loan ${payload.loanId} not found`);
    }

    // Check if already returned
    const alreadyReturned = loanEvents.some(e => e.type === 'BookReturned');
    if (alreadyReturned) {
      throw new Error(`Loan ${payload.loanId} is already returned`);
    }

    // Get borrow info
    const borrowEvent = loanEvents.find(e => e.type === 'BookBorrowed');
    if (!borrowEvent) {
      throw new Error(`Loan ${payload.loanId} has no borrow event`);
    }

    const borrowData = borrowEvent.data as any;

    // Create domain event
    const event: BookOverdueEvent = {
      loanId: payload.loanId,
      bookId: borrowData.bookId,
      memberId: borrowData.memberId,
      daysPastDue: payload.daysPastDue,
      markedOverdueAt: new Date().toISOString(),
    };

    // Append to event store
    await this.eventStore.appendEvents(payload.loanId, 'Loan', [
      {
        type: 'BookOverdue',
        aggregateId: payload.loanId,
        timestamp: new Date(),
        data: event,
      },
    ]);

    // Publish integration event
    await this.eventBus.publish({
      type: 'lending.BookOverdue',
      timestamp: new Date(),
      data: event,
    });
  }
}

