import { EventStore } from '../../../infrastructure/EventStore';
import { TaskView } from './ListTasksQuery';

/**
 * Tasks Projection - Read model for listing tasks
 * 
 * This demonstrates the CQRS pattern where the read model
 * is separate from the write model. In this case, we build
 * a denormalized read model directly from events rather than
 * using the aggregate (which is for write operations).
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

    // Build read models directly from events
    const tasks: TaskView[] = [];
    for (const [, events] of eventsByAggregate) {
      const task = this.buildTaskView(events);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  private buildTaskView(events: any[]): TaskView | null {
    let id: string | null = null;
    let title: string | null = null;
    let description: string | null = null;
    let dueDate: Date | null = null;
    let completed = false;
    let deleted = false;
    let createdAt: Date | null = null;
    let completedAt: Date | null = null;

    // Apply events in order to build the view
    for (const event of events) {
      switch (event.type) {
        case 'TaskCreated':
          id = event.data.id;
          title = event.data.title;
          description = event.data.description || null;
          dueDate = event.data.dueDate || null;
          createdAt = event.data.createdAt;
          break;
        case 'TaskCompleted':
          completed = true;
          completedAt = event.data.completedAt;
          break;
        case 'TaskDeleted':
          deleted = true;
          break;
      }
    }

    if (!id || !title || !createdAt) {
      return null;
    }

    return {
      id,
      title,
      description,
      dueDate,
      completed,
      deleted,
      createdAt,
      completedAt,
    };
  }
}

