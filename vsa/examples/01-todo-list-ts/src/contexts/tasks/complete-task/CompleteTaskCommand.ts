/**
 * Command to mark a task as completed
 */
export class CompleteTaskCommand {
  constructor(public readonly aggregateId: string) { }
}

