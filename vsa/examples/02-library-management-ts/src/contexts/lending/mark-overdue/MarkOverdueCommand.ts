/**
 * Command to mark a loan as overdue
 */
export class MarkOverdueCommand {
  constructor(
    public readonly aggregateId: string // loan ID
  ) {}
}
