export class AddBookCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly isbn: string,
    public readonly title: string,
    public readonly author: string,
    public readonly publicationYear: number,
    public readonly totalCopies: number
  ) { }
}

