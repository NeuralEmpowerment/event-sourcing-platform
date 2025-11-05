import { v4 as uuidv4 } from 'uuid';
import { EventStoreAdapter } from '../../src/infrastructure/EventStoreAdapter';
import { CommandBus } from '../../src/infrastructure/CommandBus';
import { CreateTaskHandler } from '../../src/contexts/tasks/create-task/CreateTaskHandler';
import { CompleteTaskHandler } from '../../src/contexts/tasks/complete-task/CompleteTaskHandler';
import { DeleteTaskHandler } from '../../src/contexts/tasks/delete-task/DeleteTaskHandler';
import { ListTasksHandler } from '../../src/contexts/tasks/list-tasks/ListTasksHandler';
import { TasksProjection } from '../../src/contexts/tasks/list-tasks/TasksProjection';

/**
 * E2E Tests for Todo List Application
 * 
 * These tests run against the real event store infrastructure
 * Prerequisites:
 * - Event store must be running on localhost:50051
 * - PostgreSQL must be running and accessible
 * 
 * Run: npm run test:e2e
 */

describe('Todo List E2E Tests', () => {
  let eventStore: EventStoreAdapter;
  let commandBus: CommandBus;
  let listTasksHandler: ListTasksHandler;
  let projection: TasksProjection;

  const eventStoreAddress = process.env.EVENT_STORE_ADDRESS || 'localhost:50051';
  const tenantId = `e2e-test-${Date.now()}`; // Unique tenant for isolation

  beforeAll(async () => {
    // Initialize real event store
    eventStore = new EventStoreAdapter({
      address: eventStoreAddress,
      tenantId,
    });

    // Initialize command bus and handlers
    commandBus = new CommandBus();
    commandBus.register('CreateTask', new CreateTaskHandler(eventStore));
    commandBus.register('CompleteTask', new CompleteTaskHandler(eventStore));
    commandBus.register('DeleteTask', new DeleteTaskHandler(eventStore));

    // Initialize projection and query handler
    projection = new TasksProjection();
    listTasksHandler = new ListTasksHandler(projection);

    console.log(`E2E tests using event store at ${eventStoreAddress}`);
    console.log(`Using tenant: ${tenantId}`);
  });

  afterAll(async () => {
    // Cleanup
    await eventStore.close();
  });

  describe('Complete Todo Workflow', () => {
    it('should create, complete, and delete a task', async () => {
      const taskId = uuidv4();

      // Step 1: Create a task
      await commandBus.dispatch({
        type: 'CreateTask',
        payload: {
          id: taskId,
          title: 'E2E Test Task',
          description: 'This task is created by E2E tests',
        },
      });

      // Load events from event store
      const eventsAfterCreate = await eventStore.load(taskId);
      expect(eventsAfterCreate).toHaveLength(1);
      expect(eventsAfterCreate[0].type).toBe('TaskCreated');

      // Update projection
      for (const event of eventsAfterCreate) {
        projection.handle(event);
      }

      // Step 2: List tasks
      const listResult = await listTasksHandler.handle({
        type: 'ListTasks',
        payload: {},
      });

      expect(listResult.tasks).toContainEqual(
        expect.objectContaining({
          id: taskId,
          title: 'E2E Test Task',
          status: 'pending',
        })
      );

      // Step 3: Complete the task
      await commandBus.dispatch({
        type: 'CompleteTask',
        payload: { id: taskId },
      });

      // Load events again
      const eventsAfterComplete = await eventStore.load(taskId);
      expect(eventsAfterComplete).toHaveLength(2);
      expect(eventsAfterComplete[1].type).toBe('TaskCompleted');

      // Update projection
      for (const event of eventsAfterComplete) {
        projection.handle(event);
      }

      // Verify task is completed
      const listResultAfterComplete = await listTasksHandler.handle({
        type: 'ListTasks',
        payload: {},
      });

      const completedTask = listResultAfterComplete.tasks.find((t) => t.id === taskId);
      expect(completedTask?.status).toBe('completed');

      // Step 4: Delete the task
      await commandBus.dispatch({
        type: 'DeleteTask',
        payload: { id: taskId },
      });

      // Load events one more time
      const eventsAfterDelete = await eventStore.load(taskId);
      expect(eventsAfterDelete).toHaveLength(3);
      expect(eventsAfterDelete[2].type).toBe('TaskDeleted');

      // Update projection
      for (const event of eventsAfterDelete) {
        projection.handle(event);
      }

      // Verify task is deleted
      const listResultAfterDelete = await listTasksHandler.handle({
        type: 'ListTasks',
        payload: {},
      });

      const deletedTask = listResultAfterDelete.tasks.find((t) => t.id === taskId);
      expect(deletedTask).toBeUndefined();
    });

    it('should handle multiple tasks', async () => {
      const task1Id = uuidv4();
      const task2Id = uuidv4();
      const task3Id = uuidv4();

      // Create multiple tasks
      await commandBus.dispatch({
        type: 'CreateTask',
        payload: {
          id: task1Id,
          title: 'Task 1',
          description: 'First task',
        },
      });

      await commandBus.dispatch({
        type: 'CreateTask',
        payload: {
          id: task2Id,
          title: 'Task 2',
          description: 'Second task',
        },
      });

      await commandBus.dispatch({
        type: 'CreateTask',
        payload: {
          id: task3Id,
          title: 'Task 3',
          description: 'Third task',
        },
      });

      // Load events for all tasks and update projection
      const allTaskIds = [task1Id, task2Id, task3Id];
      for (const taskId of allTaskIds) {
        const events = await eventStore.load(taskId);
        for (const event of events) {
          projection.handle(event);
        }
      }

      // List all tasks
      const listResult = await listTasksHandler.handle({
        type: 'ListTasks',
        payload: {},
      });

      expect(listResult.tasks.length).toBeGreaterThanOrEqual(3);

      // Complete one task
      await commandBus.dispatch({
        type: 'CompleteTask',
        payload: { id: task2Id },
      });

      // Update projection with new events
      const task2Events = await eventStore.load(task2Id);
      for (const event of task2Events) {
        projection.handle(event);
      }

      // List pending tasks
      const pendingResult = await listTasksHandler.handle({
        type: 'ListTasks',
        payload: { status: 'pending' },
      });

      expect(pendingResult.tasks.find((t) => t.id === task1Id)).toBeDefined();
      expect(pendingResult.tasks.find((t) => t.id === task2Id)).toBeUndefined();
      expect(pendingResult.tasks.find((t) => t.id === task3Id)).toBeDefined();

      // List completed tasks
      const completedResult = await listTasksHandler.handle({
        type: 'ListTasks',
        payload: { status: 'completed' },
      });

      expect(completedResult.tasks.find((t) => t.id === task2Id)).toBeDefined();
    });

    it('should persist events across application restarts', async () => {
      const taskId = uuidv4();

      // Create a task
      await commandBus.dispatch({
        type: 'CreateTask',
        payload: {
          id: taskId,
          title: 'Persistent Task',
          description: 'This task should persist',
        },
      });

      // Simulate application restart by creating a new event store instance
      const newEventStore = new EventStoreAdapter({
        address: eventStoreAddress,
        tenantId,
      });

      // Load events from the new instance
      const events = await newEventStore.load(taskId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('TaskCreated');
      expect(events[0].data).toMatchObject({
        id: taskId,
        title: 'Persistent Task',
      });

      await newEventStore.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent task gracefully', async () => {
      const nonExistentId = uuidv4();

      // Try to load events for non-existent task
      const events = await eventStore.load(nonExistentId);
      expect(events).toEqual([]);
    });

    it('should handle optimistic concurrency', async () => {
      const taskId = uuidv4();

      // Create a task
      await commandBus.dispatch({
        type: 'CreateTask',
        payload: {
          id: taskId,
          title: 'Concurrency Test',
          description: 'Testing concurrency',
        },
      });

      // Complete the task
      await commandBus.dispatch({
        type: 'CompleteTask',
        payload: { id: taskId },
      });

      // Verify events are in correct order
      const events = await eventStore.load(taskId);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('TaskCreated');
      expect(events[1].type).toBe('TaskCompleted');
    });
  });
});

