/**
 * Command to create a new task
 */
export interface CreateTaskCommand {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
}

