import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

export class BookAddedEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'BookAdded';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly id: string,
    public readonly isbn: string,
    public readonly title: string,
    public readonly author: string,
    public readonly publicationYear: number,
    public readonly totalCopies: number,
    public readonly addedAt: string = new Date().toISOString()
  ) {
    super();
  }
}

