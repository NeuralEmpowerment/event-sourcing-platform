/**
 * Integration Event: BookOverdue
 * 
 * Published by: Lending context
 * Subscribed by: Notifications context
 * 
 * Single source of truth for book overdue events.
 */
export interface BookOverdue {
  bookId: string;
  memberId: string;
  dueDate: Date;
  daysOverdue: number;
}

