import { CompleteTaskHandler } from './CompleteTaskHandler';
import { CompleteTaskCommand } from './CompleteTaskCommand';
import { CreateTaskHandler } from '../create-task/CreateTaskHandler';
import { CreateTaskCommand } from '../create-task/CreateTaskCommand';
import { InMemoryEventStore } from '../../../infrastructure/InMemoryEventStore';

describe('CompleteTask', () => {
  let eventStore: InMemoryEventStore;
  let createHandler: CreateTaskHandler;
  let completeHandler: CompleteTaskHandler;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    createHandler = new CreateTaskHandler(eventStore);
    completeHandler = new CompleteTaskHandler(eventStore);
  });

  it('should complete a task successfully', async () => {
    // Arrange - Create a task first
    const createCommand: CreateTaskCommand = {
      id: 'task-1',
      title: 'Test task',
    };
    await createHandler.handle(createCommand);

    const completeCommand: CompleteTaskCommand = {
      id: 'task-1',
    };

    // Act
    await completeHandler.handle(completeCommand);

    // Assert
    const events = await eventStore.getEvents('task-1');
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('TaskCreated');
    expect(events[1].type).toBe('TaskCompleted');
    expect(events[1].data.completedAt).toBeInstanceOf(Date);
  });

  it('should throw error if task does not exist', async () => {
    // Arrange
    const command: CompleteTaskCommand = {
      id: 'non-existent',
    };

    // Act & Assert
    await expect(completeHandler.handle(command)).rejects.toThrow('Task with ID non-existent not found');
  });

  it('should throw error if task is already completed', async () => {
    // Arrange - Create and complete a task
    const createCommand: CreateTaskCommand = {
      id: 'task-2',
      title: 'Test task',
    };
    await createHandler.handle(createCommand);

    const completeCommand: CompleteTaskCommand = {
      id: 'task-2',
    };
    await completeHandler.handle(completeCommand);

    // Act & Assert - Try to complete again
    await expect(completeHandler.handle(completeCommand)).rejects.toThrow('Task is already completed');
  });
});

