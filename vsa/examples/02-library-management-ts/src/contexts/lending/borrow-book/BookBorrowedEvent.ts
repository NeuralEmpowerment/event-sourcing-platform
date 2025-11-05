export interface BookBorrowedEvent {
  loanId: string;
  bookId: string;
  memberId: string;
  borrowedAt: string;
  dueDate: string;
}

