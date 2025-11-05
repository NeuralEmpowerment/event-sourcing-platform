import { CreateTaskCommand } from './CreateTaskCommand';
import { TaskCreatedEvent } from './TaskCreatedEvent';
import { EventStore } from '../../../infrastructure/EventStore';

/**
 * Handler for CreateTask command
 * 
 * Business Rules:
 * - Task ID must be unique
 * - Title is required and cannot be empty
 * - Due date must be in the future (if provided)
 */
export class CreateTaskHandler {
  constructor(private eventStore: EventStore) {}

  async handle(command: CreateTaskCommand): Promise<void> {
    // Validate command
    this.validateCommand(command);

    // Check if task already exists
    const existingEvents = await this.eventStore.getEvents(command.id);
    if (existingEvents.length > 0) {
      throw new Error(`Task with ID ${command.id} already exists`);
    }

    // Create event
    const event: TaskCreatedEvent = {
      id: command.id,
      title: command.title,
      description: command.description,
      dueDate: command.dueDate,
      createdAt: new Date(),
    };

    // Store event
    await this.eventStore.appendEvent(command.id, 'TaskCreated', event);
  }

  private validateCommand(command: CreateTaskCommand): void {
    if (!command.id || command.id.trim() === '') {
      throw new Error('Task ID is required');
    }

    if (!command.title || command.title.trim() === '') {
      throw new Error('Task title is required');
    }

    if (command.dueDate && command.dueDate < new Date()) {
      throw new Error('Due date must be in the future');
    }
  }
}

