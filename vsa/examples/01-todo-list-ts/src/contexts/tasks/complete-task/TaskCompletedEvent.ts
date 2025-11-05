import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

/**
 * Event emitted when a task is completed
 */
export class TaskCompletedEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'TaskCompleted';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly id: string,
    public readonly completedAt: Date = new Date()
  ) {
    super();
  }
}

