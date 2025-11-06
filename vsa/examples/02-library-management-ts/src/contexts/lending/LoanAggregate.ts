import {
  AggregateRoot,
  Aggregate,
  EventSourcingHandler,
  CommandHandler,
} from '@event-sourcing-platform/typescript';
import { BookBorrowedEvent } from './borrow-book/BookBorrowedEvent';
import { BookReturnedEvent } from './return-book/BookReturnedEvent';
import { BookOverdueEvent } from './mark-overdue/BookOverdueEvent';
import { BorrowBookCommand } from './borrow-book/BorrowBookCommand';
import { ReturnBookCommand } from './return-book/ReturnBookCommand';
import { MarkOverdueCommand } from './mark-overdue/MarkOverdueCommand';

/** Union type of all loan events */
export type LoanEvent = BookBorrowedEvent | BookReturnedEvent | BookOverdueEvent;

export interface LoanState {
  loanId: string;
  bookId: string;
  memberId: string;
  borrowedAt: string;
  dueDate: string;
  returned: boolean;
  returnedAt?: string;
  overdue: boolean;
  overdueMarkedAt?: string;
}

/**
 * LoanAggregate - Manages the lifecycle of a book loan
 * 
 * Following ADR-004: Command handlers integrated directly into aggregate
 */
@Aggregate('Loan')
export class LoanAggregate extends AggregateRoot<LoanEvent> {
  private state: LoanState | null = null;

  get currentState(): LoanState | null {
    return this.state;
  }

  /**
   * Borrow a book - Command Handler
   */
  @CommandHandler('BorrowBookCommand')
  borrowBook(command: BorrowBookCommand): void {
    // Validation - business rules
    if (!command.bookId) {
      throw new Error('Book ID is required');
    }
    if (!command.memberId) {
      throw new Error('Member ID is required');
    }
    if (!command.dueDate) {
      throw new Error('Due date is required');
    }

    // Validate due date is in the future
    const dueDate = new Date(command.dueDate);
    if (dueDate <= new Date()) {
      throw new Error('Due date must be in the future');
    }

    if (this.id !== null) {
      throw new Error('Loan already exists');
    }

    // Initialize aggregate (required before applying events)
    this.initialize(command.aggregateId);

    // Apply event
    const event = new BookBorrowedEvent(
      command.aggregateId,
      command.bookId,
      command.memberId,
      command.dueDate,
      new Date().toISOString()
    );
    this.apply(event);
  }

  /**
   * Return a book - Command Handler
   */
  @CommandHandler('ReturnBookCommand')
  returnBook(command: ReturnBookCommand): void {
    // Validation - business rules
    if (this.id === null) {
      throw new Error('Cannot return a loan that does not exist');
    }
    if (this.state?.returned) {
      throw new Error('Loan is already returned');
    }

    // Apply event
    const event = new BookReturnedEvent(
      command.aggregateId,
      this.state!.bookId,
      this.state!.memberId,
      new Date().toISOString()
    );
    this.apply(event);
  }

  /**
   * Mark a loan as overdue - Command Handler
   */
  @CommandHandler('MarkOverdueCommand')
  markOverdue(command: MarkOverdueCommand): void {
    // Validation - business rules
    if (this.id === null) {
      throw new Error('Cannot mark overdue a loan that does not exist');
    }
    if (this.state?.returned) {
      throw new Error('Cannot mark overdue a loan that is already returned');
    }
    if (this.state?.overdue) {
      throw new Error('Loan is already marked as overdue');
    }

    // Check if loan is actually overdue
    const dueDate = new Date(this.state!.dueDate);
    const now = new Date();
    if (dueDate > now) {
      throw new Error('Loan is not yet overdue');
    }

    // Calculate days past due
    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Apply event
    const event = new BookOverdueEvent(
      command.aggregateId,
      this.state!.bookId,
      this.state!.memberId,
      daysPastDue,
      new Date().toISOString()
    );
    this.apply(event);
  }

  @EventSourcingHandler('BookBorrowed')
  private onBookBorrowed(event: BookBorrowedEvent): void {
    // State update only
    this.state = {
      loanId: event.loanId,
      bookId: event.bookId,
      memberId: event.memberId,
      borrowedAt: event.borrowedAt,
      dueDate: event.dueDate,
      returned: false,
      overdue: false,
    };
  }

  @EventSourcingHandler('BookReturned')
  private onBookReturned(event: BookReturnedEvent): void {
    if (this.state) {
      this.state.returned = true;
      this.state.returnedAt = event.returnedAt;
    }
  }

  @EventSourcingHandler('BookOverdue')
  private onBookOverdue(event: BookOverdueEvent): void {
    if (this.state) {
      this.state.overdue = true;
      this.state.overdueMarkedAt = event.markedOverdueAt;
    }
  }

  getAggregateType(): string {
    return 'Loan';
  }
}

