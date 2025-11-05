import { AggregateRoot, Aggregate, EventSourcingHandler, CommandHandler } from '@event-sourcing-platform/typescript';
import { BookAddedEvent } from './BookAddedEvent';
import { BookRemovedEvent } from '../remove-book/BookRemovedEvent';
import { AddBookCommand } from './AddBookCommand';
import { RemoveBookCommand } from '../remove-book/RemoveBookCommand';

/** Union type of all book events */
export type BookEvent = BookAddedEvent | BookRemovedEvent;

export interface BookState {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publicationYear: number;
  totalCopies: number;
  availableCopies: number;
  addedAt: Date;
  removed?: boolean;
  removedAt?: Date;
  removalReason?: string;
}

@Aggregate('Book')
export class BookAggregate extends AggregateRoot<BookEvent> {
  private state: BookState | null = null;

  get currentState(): BookState | null {
    return this.state;
  }

  /**
   * Add a new book to the catalog - Command Handler
   */
  @CommandHandler('AddBookCommand')
  addBook(command: AddBookCommand): void {
    // Validation - business rules
    if (!command.title || command.title.trim() === '') {
      throw new Error('Book title is required');
    }
    if (!command.isbn || command.isbn.trim() === '') {
      throw new Error('ISBN is required');
    }
    if (command.totalCopies < 1) {
      throw new Error('Total copies must be at least 1');
    }
    if (this.id !== null) {
      throw new Error('Book already exists');
    }

    // Initialize aggregate (required before applying events)
    this.initialize(command.aggregateId);

    // Apply event
    const event = new BookAddedEvent(
      command.aggregateId,
      command.isbn,
      command.title,
      command.author,
      command.publicationYear,
      command.totalCopies
    );
    this.apply(event);
  }

  /**
   * Remove a book from the catalog - Command Handler
   */
  @CommandHandler('RemoveBookCommand')
  removeBook(command: RemoveBookCommand): void {
    // Validation - business rules
    if (this.id === null) {
      throw new Error('Cannot remove a book that does not exist');
    }
    if (this.state?.removed) {
      throw new Error('Book is already removed');
    }
    if (!command.reason || command.reason.trim() === '') {
      throw new Error('Removal reason is required');
    }

    // Apply event
    const event = new BookRemovedEvent(command.aggregateId, command.reason);
    this.apply(event);
  }

  @EventSourcingHandler('BookAdded')
  private onBookAdded(event: BookAddedEvent): void {
    // State update only - initialization happens in command handler
    this.state = {
      id: event.id,
      isbn: event.isbn,
      title: event.title,
      author: event.author,
      publicationYear: event.publicationYear,
      totalCopies: event.totalCopies,
      availableCopies: event.totalCopies,
      addedAt: new Date(event.addedAt),
    };
  }

  @EventSourcingHandler('BookRemoved')
  private onBookRemoved(event: BookRemovedEvent): void {
    if (this.state) {
      this.state.removed = true;
      this.state.removedAt = new Date(event.removedAt);
      this.state.removalReason = event.reason;
    }
  }

  getAggregateType(): string {
    return 'Book';
  }
}

