import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

export class BookBorrowedEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'BookBorrowed';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly loanId: string,
    public readonly bookId: string,
    public readonly memberId: string,
    public readonly dueDate: string,
    public readonly borrowedAt: string = new Date().toISOString()
  ) {
    super();
  }
}

