import { AggregateRoot, Aggregate, EventSourcingHandler, CommandHandler } from '@event-sourcing-platform/typescript';
import { TaskCreatedEvent } from './TaskCreatedEvent';
import { TaskCompletedEvent } from '../complete-task/TaskCompletedEvent';
import { TaskDeletedEvent } from '../delete-task/TaskDeletedEvent';
import { CreateTaskCommand } from './CreateTaskCommand';
import { CompleteTaskCommand } from '../complete-task/CompleteTaskCommand';
import { DeleteTaskCommand } from '../delete-task/DeleteTaskCommand';

/** Union type of all task events */
export type TaskEvent = TaskCreatedEvent | TaskCompletedEvent | TaskDeletedEvent;

/**
 * Task Aggregate - Manages the lifecycle of a task using event sourcing
 */
@Aggregate('Task')
export class TaskAggregate extends AggregateRoot<TaskEvent> {
  private title: string | null = null;
  private description: string | null = null;
  private dueDate: Date | null = null;
  private completed: boolean = false;
  private deleted: boolean = false;
  private createdAt: Date | null = null;
  private completedAt: Date | null = null;

  /**
   * Create a new task - Command Handler
   */
  @CommandHandler('CreateTaskCommand')
  createTask(command: CreateTaskCommand): void {
    // Validation - business rules
    if (!command.title || command.title.trim() === '') {
      throw new Error('Task title is required');
    }

    if (this.id !== null) {
      throw new Error('Task already exists');
    }

    // Initialize aggregate with ID (required before applying events)
    this.initialize(command.aggregateId);

    // Apply event
    const event = new TaskCreatedEvent(
      command.aggregateId,
      command.title,
      command.description,
      command.dueDate
    );
    this.apply(event);
  }

  /**
   * Mark task as completed - Command Handler
   */
  @CommandHandler('CompleteTaskCommand')
  completeTask(command: CompleteTaskCommand): void {
    // Validation - business rules
    if (this.id === null) {
      throw new Error('Cannot complete a task that does not exist');
    }
    if (this.completed) {
      throw new Error('Task is already completed');
    }
    if (this.deleted) {
      throw new Error('Cannot complete a deleted task');
    }

    // Apply event
    const event = new TaskCompletedEvent(command.aggregateId);
    this.apply(event);
  }

  /**
   * Delete the task - Command Handler
   */
  @CommandHandler('DeleteTaskCommand')
  deleteTask(command: DeleteTaskCommand): void {
    // Validation - business rules
    if (this.id === null) {
      throw new Error('Cannot delete a task that does not exist');
    }
    if (this.deleted) {
      throw new Error('Task is already deleted');
    }

    // Apply event
    const event = new TaskDeletedEvent(command.aggregateId);
    this.apply(event);
  }

  /**
   * Apply TaskCreated event - State update only
   */
  @EventSourcingHandler('TaskCreated')
  private onTaskCreated(event: TaskCreatedEvent): void {
    // State update only - no validation, no business logic
    // Initialization happens in command handler
    this.title = event.title;
    this.description = event.description || null;
    this.dueDate = event.dueDate || null;
    this.createdAt = event.createdAt;
  }

  /**
   * Apply TaskCompleted event
   */
  @EventSourcingHandler('TaskCompleted')
  private onTaskCompleted(event: TaskCompletedEvent): void {
    this.completed = true;
    this.completedAt = event.completedAt;
  }

  /**
   * Apply TaskDeleted event
   */
  @EventSourcingHandler('TaskDeleted')
  private onTaskDeleted(event: TaskDeletedEvent): void {
    this.deleted = true;
  }

  // Getters
  getId(): string | null {
    return this.id;
  }

  getTitle(): string | null {
    return this.title;
  }

  getDescription(): string | null {
    return this.description;
  }

  getDueDate(): Date | null {
    return this.dueDate;
  }

  isCompleted(): boolean {
    return this.completed;
  }

  isDeleted(): boolean {
    return this.deleted;
  }

  getCreatedAt(): Date | null {
    return this.createdAt;
  }

  getCompletedAt(): Date | null {
    return this.completedAt;
  }

  /**
   * Get the aggregate type (required by AggregateRoot)
   */
  getAggregateType(): string {
    return 'Task';
  }
}

