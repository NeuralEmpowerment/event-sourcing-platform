import { DeleteTaskCommand } from './DeleteTaskCommand';
import { TaskDeletedEvent } from './TaskDeletedEvent';
import { EventStore } from '../../../infrastructure/EventStore';
import { TaskAggregate } from '../create-task/TaskAggregate';

/**
 * Handler for DeleteTask command
 * 
 * Business Rules:
 * - Task must exist
 * - Task must not be already deleted
 */
export class DeleteTaskHandler {
  constructor(private eventStore: EventStore) {}

  async handle(command: DeleteTaskCommand): Promise<void> {
    // Load task aggregate from events
    const events = await this.eventStore.getEvents(command.id);
    
    if (events.length === 0) {
      throw new Error(`Task with ID ${command.id} not found`);
    }

    // Rebuild aggregate state
    const aggregate = new TaskAggregate();
    for (const event of events) {
      this.applyEvent(aggregate, event);
    }

    // Business rule validation
    if (aggregate.isDeleted()) {
      throw new Error('Task is already deleted');
    }

    // Create event
    const event: TaskDeletedEvent = {
      id: command.id,
      deletedAt: new Date(),
    };

    // Store event
    await this.eventStore.appendEvent(command.id, 'TaskDeleted', event);
  }

  private applyEvent(aggregate: TaskAggregate, event: any): void {
    switch (event.type) {
      case 'TaskCreated':
        aggregate.applyTaskCreated(event.data);
        break;
      case 'TaskCompleted':
        aggregate.applyTaskCompleted(event.data);
        break;
      case 'TaskDeleted':
        aggregate.applyTaskDeleted(event.data);
        break;
    }
  }
}

