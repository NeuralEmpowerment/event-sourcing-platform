import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

export class BookOverdueEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'BookOverdue';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly loanId: string,
    public readonly bookId: string,
    public readonly memberId: string,
    public readonly daysPastDue: number,
    public readonly markedOverdueAt: string = new Date().toISOString()
  ) {
    super();
  }
}

