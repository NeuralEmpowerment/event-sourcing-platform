import { EventStore } from '../../../infrastructure/EventStore';
import { TaskAggregate } from '../create-task/TaskAggregate';
import { TaskView } from './ListTasksQuery';

/**
 * Tasks Projection - Read model for listing tasks
 * 
 * This demonstrates the CQRS pattern where the read model
 * is separate from the write model (aggregates).
 */
export class TasksProjection {
  constructor(private eventStore: EventStore) {}

  async getAllTasks(): Promise<TaskView[]> {
    const allEvents = await this.eventStore.getAllEvents();
    
    // Group events by aggregate ID
    const eventsByAggregate = new Map<string, any[]>();
    for (const event of allEvents) {
      const events = eventsByAggregate.get(event.aggregateId) || [];
      events.push(event);
      eventsByAggregate.set(event.aggregateId, events);
    }

    // Rebuild aggregates and create views
    const tasks: TaskView[] = [];
    for (const [, events] of eventsByAggregate) {
      const aggregate = new TaskAggregate();
      
      for (const event of events) {
        this.applyEvent(aggregate, event);
      }

      // Convert aggregate to view model
      tasks.push({
        id: aggregate.getId()!,
        title: aggregate.getTitle()!,
        description: aggregate.getDescription(),
        dueDate: aggregate.getDueDate(),
        completed: aggregate.isCompleted(),
        deleted: aggregate.isDeleted(),
        createdAt: aggregate.getCreatedAt()!,
        completedAt: aggregate.getCompletedAt(),
      });
    }

    return tasks;
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

