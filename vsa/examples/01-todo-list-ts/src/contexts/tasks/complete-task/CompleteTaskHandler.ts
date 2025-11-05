import { CompleteTaskCommand } from './CompleteTaskCommand';
import { TaskCompletedEvent } from './TaskCompletedEvent';
import { EventStore } from '../../../infrastructure/EventStore';
import { TaskAggregate } from '../create-task/TaskAggregate';

/**
 * Handler for CompleteTask command
 * 
 * Business Rules:
 * - Task must exist
 * - Task must not be already completed
 * - Task must not be deleted
 */
export class CompleteTaskHandler {
  constructor(private eventStore: EventStore) {}

  async handle(command: CompleteTaskCommand): Promise<void> {
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
    if (aggregate.isCompleted()) {
      throw new Error('Task is already completed');
    }

    if (aggregate.isDeleted()) {
      throw new Error('Cannot complete a deleted task');
    }

    // Create event
    const event: TaskCompletedEvent = {
      id: command.id,
      completedAt: new Date(),
    };

    // Store event
    await this.eventStore.appendEvent(command.id, 'TaskCompleted', event);
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

