export interface AddBookCommand {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publicationYear: number;
  totalCopies: number;
}

