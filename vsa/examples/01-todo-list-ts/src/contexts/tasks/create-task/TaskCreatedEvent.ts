import { BaseDomainEvent, EventType } from '@event-sourcing-platform/typescript';

/**
 * Event emitted when a task is created
 */
export class TaskCreatedEvent extends BaseDomainEvent {
  readonly eventType: EventType = 'TaskCreated';
  readonly schemaVersion: number = 1;

  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description?: string,
    public readonly dueDate?: Date,
    public readonly createdAt: Date = new Date()
  ) {
    super();
  }
}

