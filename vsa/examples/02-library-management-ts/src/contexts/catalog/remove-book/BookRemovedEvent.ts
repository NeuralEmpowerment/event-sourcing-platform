import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

export class BookRemovedEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'BookRemoved';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly id: string,
    public readonly reason: string,
    public readonly removedAt: string = new Date().toISOString()
  ) {
    super();
  }
}

