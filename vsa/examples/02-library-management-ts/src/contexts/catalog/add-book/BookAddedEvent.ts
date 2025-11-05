export interface BookAddedEvent {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publicationYear: number;
  totalCopies: number;
  addedAt: string;
}

