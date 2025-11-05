/**
 * Integration Event: BookReturned
 * 
 * Published by: Lending context
 * Subscribed by: Notifications context
 * 
 * Single source of truth for book return events.
 */
export interface BookReturned {
  bookId: string;
  memberId: string;
  returnedAt: Date;
}

