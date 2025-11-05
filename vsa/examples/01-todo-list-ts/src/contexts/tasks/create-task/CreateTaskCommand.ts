/**
 * Command to create a new task
 */
export class CreateTaskCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly title: string,
    public readonly description?: string,
    public readonly dueDate?: Date
  ) { }
}

