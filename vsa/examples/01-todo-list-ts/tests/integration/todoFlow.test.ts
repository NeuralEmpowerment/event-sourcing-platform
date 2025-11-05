import { InMemoryEventStore } from '../../src/infrastructure/InMemoryEventStore';
import { CreateTaskHandler } from '../../src/contexts/tasks/create-task/CreateTaskHandler';
import { CompleteTaskHandler } from '../../src/contexts/tasks/complete-task/CompleteTaskHandler';
import { DeleteTaskHandler } from '../../src/contexts/tasks/delete-task/DeleteTaskHandler';
import { ListTasksHandler } from '../../src/contexts/tasks/list-tasks/ListTasksHandler';
import { TasksProjection } from '../../src/contexts/tasks/list-tasks/TasksProjection';

/**
 * Integration tests for complete todo workflow
 * 
 * These tests verify that all features work together correctly
 * and demonstrate typical user flows.
 */
describe('Todo Flow Integration Tests', () => {
  let eventStore: InMemoryEventStore;
  let createHandler: CreateTaskHandler;
  let completeHandler: CompleteTaskHandler;
  let deleteHandler: DeleteTaskHandler;
  let listHandler: ListTasksHandler;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    createHandler = new CreateTaskHandler(eventStore);
    completeHandler = new CompleteTaskHandler(eventStore);
    deleteHandler = new DeleteTaskHandler(eventStore);
    const projection = new TasksProjection(eventStore);
    listHandler = new ListTasksHandler(projection);
  });

  it('should handle complete task lifecycle', async () => {
    // Create a task
    await createHandler.handle({
      id: 'task-1',
      title: 'Buy groceries',
      description: 'Milk, eggs, bread',
    });

    // List tasks
    let tasks = await listHandler.handle({});
    expect(tasks).toHaveLength(1);
    expect(tasks[0].completed).toBe(false);

    // Complete the task
    await completeHandler.handle({ id: 'task-1' });

    // List tasks (should be hidden by default)
    tasks = await listHandler.handle({});
    expect(tasks).toHaveLength(0);

    // List with completed
    tasks = await listHandler.handle({ includeCompleted: true });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].completed).toBe(true);
  });

  it('should handle multiple tasks workflow', async () => {
    // Create multiple tasks
    await createHandler.handle({ id: 'task-1', title: 'Task 1' });
    await createHandler.handle({ id: 'task-2', title: 'Task 2' });
    await createHandler.handle({ id: 'task-3', title: 'Task 3' });

    // List all tasks
    let tasks = await listHandler.handle({});
    expect(tasks).toHaveLength(3);

    // Complete one task
    await completeHandler.handle({ id: 'task-2' });

    // List active tasks
    tasks = await listHandler.handle({});
    expect(tasks).toHaveLength(2);
    expect(tasks.find(t => t.id === 'task-2')).toBeUndefined();

    // Delete one task
    await deleteHandler.handle({ id: 'task-1' });

    // List active tasks
    tasks = await listHandler.handle({});
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('task-3');
  });

  it('should persist event history correctly', async () => {
    // Create a task
    await createHandler.handle({
      id: 'task-1',
      title: 'Test task',
    });

    // Complete it
    await completeHandler.handle({ id: 'task-1' });

    // Delete it
    await deleteHandler.handle({ id: 'task-1' });

    // Verify all events are stored
    const events = await eventStore.getEvents('task-1');
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('TaskCreated');
    expect(events[1].type).toBe('TaskCompleted');
    expect(events[2].type).toBe('TaskDeleted');
  });

  it('should handle complex filtering scenarios', async () => {
    // Create mix of tasks
    await createHandler.handle({ id: 'task-1', title: 'Active 1' });
    await createHandler.handle({ id: 'task-2', title: 'Active 2' });
    await createHandler.handle({ id: 'task-3', title: 'To Complete' });
    await createHandler.handle({ id: 'task-4', title: 'To Delete' });

    // Complete one
    await completeHandler.handle({ id: 'task-3' });

    // Delete one
    await deleteHandler.handle({ id: 'task-4' });

    // Test different filters
    const activeTasks = await listHandler.handle({});
    expect(activeTasks).toHaveLength(2);
    expect(activeTasks.every(t => !t.completed && !t.deleted)).toBe(true);

    const withCompleted = await listHandler.handle({ includeCompleted: true });
    expect(withCompleted).toHaveLength(3);

    const all = await listHandler.handle({ includeCompleted: true, includeDeleted: true });
    expect(all).toHaveLength(4);
  });
});

