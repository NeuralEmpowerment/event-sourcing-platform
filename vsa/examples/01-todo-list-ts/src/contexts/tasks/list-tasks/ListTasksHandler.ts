import { ListTasksQuery, TaskView } from './ListTasksQuery';
import { TasksProjection } from './TasksProjection';

/**
 * Handler for ListTasks query
 * 
 * Demonstrates CQRS pattern - queries use projections (read models)
 * instead of aggregates.
 */
export class ListTasksHandler {
  constructor(private projection: TasksProjection) {}

  async handle(query: ListTasksQuery): Promise<TaskView[]> {
    // Get all tasks from projection
    let tasks = await this.projection.getAllTasks();

    // Filter based on query parameters
    if (!query.includeCompleted) {
      tasks = tasks.filter(task => !task.completed);
    }

    if (!query.includeDeleted) {
      tasks = tasks.filter(task => !task.deleted);
    }

    // Sort by creation date (newest first)
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return tasks;
  }
}

