/**
 * Event emitted when a task is created
 */
export interface TaskCreatedEvent {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  createdAt: Date;
}

