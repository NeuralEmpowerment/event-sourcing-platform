import { TaskCreatedEvent } from './TaskCreatedEvent';
import { TaskCompletedEvent } from '../complete-task/TaskCompletedEvent';
import { TaskDeletedEvent } from '../delete-task/TaskDeletedEvent';

/**
 * Task Aggregate - Manages the lifecycle of a task using event sourcing
 */
export class TaskAggregate {
  private id: string | null = null;
  private title: string | null = null;
  private description: string | null = null;
  private dueDate: Date | null = null;
  private completed: boolean = false;
  private deleted: boolean = false;
  private createdAt: Date | null = null;
  private completedAt: Date | null = null;

  /**
   * Apply TaskCreated event
   */
  applyTaskCreated(event: TaskCreatedEvent): void {
    this.id = event.id;
    this.title = event.title;
    this.description = event.description || null;
    this.dueDate = event.dueDate || null;
    this.createdAt = event.createdAt;
  }

  /**
   * Apply TaskCompleted event
   */
  applyTaskCompleted(event: TaskCompletedEvent): void {
    this.completed = true;
    this.completedAt = event.completedAt;
  }

  /**
   * Apply TaskDeleted event
   */
  applyTaskDeleted(event: TaskDeletedEvent): void {
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
}

