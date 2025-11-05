import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

/**
 * Event emitted when a task is deleted
 */
export class TaskDeletedEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'TaskDeleted';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly id: string,
    public readonly deletedAt: Date = new Date()
  ) {
    super();
  }
}

