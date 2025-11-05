import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

export class BookReturnedEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'BookReturned';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly loanId: string,
    public readonly bookId: string,
    public readonly memberId: string,
    public readonly returnedAt: string = new Date().toISOString()
  ) {
    super();
  }
}

