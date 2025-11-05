import type { BookAddedEvent } from './BookAddedEvent';

export interface BookState {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publicationYear: number;
  totalCopies: number;
  availableCopies: number;
  addedAt: Date;
}

export class BookAggregate {
  private state: BookState | null = null;

  get currentState(): BookState | null {
    return this.state;
  }

  applyBookAdded(event: BookAddedEvent): void {
    this.state = {
      id: event.id,
      isbn: event.isbn,
      title: event.title,
      author: event.author,
      publicationYear: event.publicationYear,
      totalCopies: event.totalCopies,
      availableCopies: event.totalCopies,
      addedAt: new Date(event.addedAt),
    };
  }
}

