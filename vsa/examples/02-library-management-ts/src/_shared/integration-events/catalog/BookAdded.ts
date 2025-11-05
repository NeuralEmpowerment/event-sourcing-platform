/**
 * Integration Event: BookAdded
 * 
 * Published by: Catalog context
 * Subscribed by: Lending context
 * 
 * This is the SINGLE SOURCE OF TRUTH for the BookAdded integration event.
 * All contexts reference this same file to ensure consistency.
 */
export interface BookAdded {
  bookId: string;
  isbn: string;
  title: string;
  author: string;
  addedAt: Date;
}

