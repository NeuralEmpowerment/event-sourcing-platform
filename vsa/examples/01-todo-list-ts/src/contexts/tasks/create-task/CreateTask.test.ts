import { CreateTaskHandler } from './CreateTaskHandler';
import { CreateTaskCommand } from './CreateTaskCommand';
import { InMemoryEventStore } from '../../../infrastructure/InMemoryEventStore';

describe('CreateTask', () => {
  let eventStore: InMemoryEventStore;
  let handler: CreateTaskHandler;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    handler = new CreateTaskHandler(eventStore);
  });

  it('should create a task successfully', async () => {
    // Arrange
    const command: CreateTaskCommand = {
      id: 'task-1',
      title: 'Buy groceries',
      description: 'Milk, eggs, bread',
      dueDate: new Date(Date.now() + 86400000), // Tomorrow
    };

    // Act
    await handler.handle(command);

    // Assert
    const events = await eventStore.getEvents('task-1');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('TaskCreated');
    expect(events[0].data).toMatchObject({
      id: 'task-1',
      title: 'Buy groceries',
      description: 'Milk, eggs, bread',
    });
  });

  it('should create a task without optional fields', async () => {
    // Arrange
    const command: CreateTaskCommand = {
      id: 'task-2',
      title: 'Simple task',
    };

    // Act
    await handler.handle(command);

    // Assert
    const events = await eventStore.getEvents('task-2');
    expect(events).toHaveLength(1);
    expect(events[0].data).toMatchObject({
      id: 'task-2',
      title: 'Simple task',
    });
    expect(events[0].data.description).toBeUndefined();
  });

  it('should throw error if task ID is empty', async () => {
    // Arrange
    const command: CreateTaskCommand = {
      id: '',
      title: 'Test task',
    };

    // Act & Assert
    await expect(handler.handle(command)).rejects.toThrow('Task ID is required');
  });

  it('should throw error if title is empty', async () => {
    // Arrange
    const command: CreateTaskCommand = {
      id: 'task-3',
      title: '',
    };

    // Act & Assert
    await expect(handler.handle(command)).rejects.toThrow('Task title is required');
  });

  it('should throw error if due date is in the past', async () => {
    // Arrange
    const command: CreateTaskCommand = {
      id: 'task-4',
      title: 'Past task',
      dueDate: new Date(Date.now() - 86400000), // Yesterday
    };

    // Act & Assert
    await expect(handler.handle(command)).rejects.toThrow('Due date must be in the future');
  });

  it('should throw error if task already exists', async () => {
    // Arrange
    const command: CreateTaskCommand = {
      id: 'task-5',
      title: 'Duplicate task',
    };

    // Act
    await handler.handle(command);

    // Act & Assert - Try to create same task again
    await expect(handler.handle(command)).rejects.toThrow('Task with ID task-5 already exists');
  });
});

