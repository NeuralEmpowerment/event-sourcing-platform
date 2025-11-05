/**
 * Command to delete a task
 */
export class DeleteTaskCommand {
  constructor(public readonly aggregateId: string) { }
}

