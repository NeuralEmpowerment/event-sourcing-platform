import { DeleteTaskHandler } from './DeleteTaskHandler';
import { DeleteTaskCommand } from './DeleteTaskCommand';
import { CreateTaskHandler } from '../create-task/CreateTaskHandler';
import { CreateTaskCommand } from '../create-task/CreateTaskCommand';
import { InMemoryEventStore } from '../../../infrastructure/InMemoryEventStore';

describe('DeleteTask', () => {
  let eventStore: InMemoryEventStore;
  let createHandler: CreateTaskHandler;
  let deleteHandler: DeleteTaskHandler;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    createHandler = new CreateTaskHandler(eventStore);
    deleteHandler = new DeleteTaskHandler(eventStore);
  });

  it('should delete a task successfully', async () => {
    // Arrange - Create a task first
    const createCommand: CreateTaskCommand = {
      id: 'task-1',
      title: 'Test task',
    };
    await createHandler.handle(createCommand);

    const deleteCommand: DeleteTaskCommand = {
      id: 'task-1',
    };

    // Act
    await deleteHandler.handle(deleteCommand);

    // Assert
    const events = await eventStore.getEvents('task-1');
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('TaskCreated');
    expect(events[1].type).toBe('TaskDeleted');
    expect(events[1].data.deletedAt).toBeInstanceOf(Date);
  });

  it('should throw error if task does not exist', async () => {
    // Arrange
    const command: DeleteTaskCommand = {
      id: 'non-existent',
    };

    // Act & Assert
    await expect(deleteHandler.handle(command)).rejects.toThrow('Task with ID non-existent not found');
  });

  it('should throw error if task is already deleted', async () => {
    // Arrange - Create and delete a task
    const createCommand: CreateTaskCommand = {
      id: 'task-2',
      title: 'Test task',
    };
    await createHandler.handle(createCommand);

    const deleteCommand: DeleteTaskCommand = {
      id: 'task-2',
    };
    await deleteHandler.handle(deleteCommand);

    // Act & Assert - Try to delete again
    await expect(deleteHandler.handle(deleteCommand)).rejects.toThrow('Task is already deleted');
  });
});

