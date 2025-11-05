import { ListTasksHandler } from './ListTasksHandler';
import { ListTasksQuery } from './ListTasksQuery';
import { TasksProjection } from './TasksProjection';
import { CreateTaskHandler } from '../create-task/CreateTaskHandler';
import { CompleteTaskHandler } from '../complete-task/CompleteTaskHandler';
import { CreateTaskCommand } from '../create-task/CreateTaskCommand';
import { CompleteTaskCommand } from '../complete-task/CompleteTaskCommand';
import { InMemoryEventStore } from '../../../infrastructure/InMemoryEventStore';

describe('ListTasks', () => {
  let eventStore: InMemoryEventStore;
  let createHandler: CreateTaskHandler;
  let completeHandler: CompleteTaskHandler;
  let projection: TasksProjection;
  let listHandler: ListTasksHandler;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    createHandler = new CreateTaskHandler(eventStore);
    completeHandler = new CompleteTaskHandler(eventStore);
    projection = new TasksProjection(eventStore);
    listHandler = new ListTasksHandler(projection);
  });

  it('should list all active tasks', async () => {
    // Arrange - Create some tasks
    await createHandler.handle({ id: 'task-1', title: 'Task 1' });
    await createHandler.handle({ id: 'task-2', title: 'Task 2' });
    await createHandler.handle({ id: 'task-3', title: 'Task 3' });

    const query: ListTasksQuery = {
      includeCompleted: false,
      includeDeleted: false,
    };

    // Act
    const tasks = await listHandler.handle(query);

    // Assert
    expect(tasks).toHaveLength(3);
    expect(tasks[0].title).toBe('Task 3'); // Newest first
    expect(tasks[1].title).toBe('Task 2');
    expect(tasks[2].title).toBe('Task 1');
  });

  it('should exclude completed tasks by default', async () => {
    // Arrange
    await createHandler.handle({ id: 'task-1', title: 'Task 1' });
    await createHandler.handle({ id: 'task-2', title: 'Task 2' });
    await completeHandler.handle({ id: 'task-1' });

    const query: ListTasksQuery = {
      includeCompleted: false,
    };

    // Act
    const tasks = await listHandler.handle(query);

    // Assert
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('task-2');
    expect(tasks[0].completed).toBe(false);
  });

  it('should include completed tasks when requested', async () => {
    // Arrange
    await createHandler.handle({ id: 'task-1', title: 'Task 1' });
    await createHandler.handle({ id: 'task-2', title: 'Task 2' });
    await completeHandler.handle({ id: 'task-1' });

    const query: ListTasksQuery = {
      includeCompleted: true,
    };

    // Act
    const tasks = await listHandler.handle(query);

    // Assert
    expect(tasks).toHaveLength(2);
    expect(tasks.find(t => t.id === 'task-1')?.completed).toBe(true);
    expect(tasks.find(t => t.id === 'task-2')?.completed).toBe(false);
  });

  it('should return empty array when no tasks exist', async () => {
    // Arrange
    const query: ListTasksQuery = {};

    // Act
    const tasks = await listHandler.handle(query);

    // Assert
    expect(tasks).toHaveLength(0);
  });
});

