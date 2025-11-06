/**
 * Command to return a borrowed book
 */
export class ReturnBookCommand {
  constructor(
    public readonly aggregateId: string // loan ID
  ) {}
}
