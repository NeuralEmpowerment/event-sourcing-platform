/**
 * Integration Event: BookRemoved
 * 
 * Published by: Catalog context
 * Subscribed by: Lending context
 * 
 * Single source of truth for book removal events.
 */
export interface BookRemoved {
  bookId: string;
  reason: string;
  removedAt: Date;
}

