export class RemoveBookCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly reason: string
  ) { }
}

