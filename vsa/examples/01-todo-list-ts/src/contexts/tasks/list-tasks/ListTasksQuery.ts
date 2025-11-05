/**
 * Query to list all tasks
 */
export interface ListTasksQuery {
  includeCompleted?: boolean;
  includeDeleted?: boolean;
}

/**
 * Task view model for queries
 */
export interface TaskView {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  deleted: boolean;
  createdAt: Date;
  completedAt: Date | null;
}

