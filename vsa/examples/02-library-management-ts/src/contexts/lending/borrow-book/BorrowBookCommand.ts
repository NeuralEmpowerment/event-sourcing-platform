/**
 * Command to borrow a book
 */
export class BorrowBookCommand {
  constructor(
    public readonly aggregateId: string, // loan ID
    public readonly bookId: string,
    public readonly memberId: string,
    public readonly dueDate: string
  ) {}
}
