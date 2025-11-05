/**
 * Integration Event: BookBorrowed
 * 
 * Published by: Lending context
 * Subscribed by: Notifications context
 * 
 * Single source of truth for book borrowing events.
 */
export interface BookBorrowed {
  bookId: string;
  memberId: string;
  borrowedAt: Date;
  dueDate: Date;
}

