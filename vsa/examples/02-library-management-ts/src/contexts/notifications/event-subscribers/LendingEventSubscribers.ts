import type { IntegrationEvent } from '../../../infrastructure/EventStoreAdapter';
import type { CommandBus } from '../../../infrastructure/CommandBus';

/**
 * Event Subscribers for Lending events
 * These subscribe to integration events from the Lending context
 * and trigger notifications
 */

export function registerLendingEventSubscribers(commandBus: CommandBus) {
  return {
    // Subscribe to BookBorrowed events
    async onBookBorrowed(event: IntegrationEvent): Promise<void> {
      const data = event.data as any;
      
      await commandBus.dispatch({
        type: 'SendNotification',
        payload: {
          memberId: data.memberId,
          type: 'BORROW_CONFIRMATION',
          message: `You have successfully borrowed book ${data.bookId}. Due date: ${new Date(data.dueDate).toLocaleDateString()}`,
          metadata: {
            loanId: data.loanId,
            bookId: data.bookId,
            dueDate: data.dueDate,
          },
        },
      });
    },

    // Subscribe to BookReturned events
    async onBookReturned(event: IntegrationEvent): Promise<void> {
      const data = event.data as any;
      
      await commandBus.dispatch({
        type: 'SendNotification',
        payload: {
          memberId: data.memberId,
          type: 'RETURN_CONFIRMATION',
          message: `Thank you for returning book ${data.bookId}.`,
          metadata: {
            loanId: data.loanId,
            bookId: data.bookId,
          },
        },
      });
    },

    // Subscribe to BookOverdue events
    async onBookOverdue(event: IntegrationEvent): Promise<void> {
      const data = event.data as any;
      
      await commandBus.dispatch({
        type: 'SendNotification',
        payload: {
          memberId: data.memberId,
          type: 'OVERDUE',
          message: `OVERDUE: Book ${data.bookId} is ${data.daysPastDue} days overdue. Please return it as soon as possible.`,
          metadata: {
            loanId: data.loanId,
            bookId: data.bookId,
            daysPastDue: data.daysPastDue,
          },
        },
      });
    },
  };
}

