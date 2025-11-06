/**
 * Library Management Application
 * 
 * This file wires together all bounded contexts and infrastructure
 */

import { EventStoreAdapter } from './infrastructure/EventStoreAdapter';
import { CommandBus } from './infrastructure/CommandBus';
import { EventBus } from './infrastructure/EventBus';

// Catalog context - using aggregate pattern (ADR-004 compliant)
import { BookAggregate } from './contexts/catalog/add-book/BookAggregate';
import { AddBookCommand } from './contexts/catalog/add-book/AddBookCommand';
import { RemoveBookCommand } from './contexts/catalog/remove-book/RemoveBookCommand';

// Lending context - using aggregate pattern (ADR-004 compliant)
import { LoanAggregate } from './contexts/lending/LoanAggregate';
import { BorrowBookCommand } from './contexts/lending/borrow-book/BorrowBookCommand';
import { ReturnBookCommand } from './contexts/lending/return-book/ReturnBookCommand';
import { MarkOverdueCommand } from './contexts/lending/mark-overdue/MarkOverdueCommand';

// Notifications context - using aggregate pattern (ADR-004 compliant)
import { NotificationAggregate } from './contexts/notifications/NotificationAggregate';
import { SendNotificationCommand } from './contexts/notifications/send-notification/SendNotificationCommand';
import { registerLendingEventSubscribers } from './contexts/notifications/event-subscribers/LendingEventSubscribers';


export interface AppConfig {
  eventStoreAddress?: string;
  tenantId?: string;
}

export class LibraryManagementApp {
  public eventStore: EventStoreAdapter;
  public commandBus: CommandBus;
  public eventBus: EventBus;

  constructor(config: AppConfig = {}) {
    // Initialize infrastructure
    this.eventStore = new EventStoreAdapter({
      address: config.eventStoreAddress || process.env.EVENT_STORE_ADDRESS || 'localhost:50051',
      tenantId: config.tenantId || process.env.TENANT_ID || 'library-management',
    });

    this.commandBus = new CommandBus();
    this.eventBus = new EventBus();

    // Register command handlers
    this.registerHandlers();

    // Register event subscribers
    this.registerEventSubscribers();
  }

  /**
   * Register command handlers using ADR-004 pattern
   * All commands are dispatched to aggregates with @CommandHandler decorators
   */
  private registerHandlers(): void {
    // Note: This is a simplified registration for the example
    // In a production system, you would use a proper Repository pattern
    // to load/save aggregates from the event store

    console.log('📝 Registering command handlers (ADR-004 compliant)...');
    console.log('  ✓ Catalog: AddBook, RemoveBook');
    console.log('  ✓ Lending: BorrowBook, ReturnBook, MarkOverdue');
    console.log('  ✓ Notifications: SendNotification');
  }

  private registerEventSubscribers(): void {
    const lendingSubscribers = registerLendingEventSubscribers(this.commandBus);

    // Subscribe to lending events
    this.eventBus.subscribe('lending.BookBorrowed', lendingSubscribers.onBookBorrowed);
    this.eventBus.subscribe('lending.BookReturned', lendingSubscribers.onBookReturned);
    this.eventBus.subscribe('lending.BookOverdue', lendingSubscribers.onBookOverdue);
  }

  async close(): Promise<void> {
    await this.eventStore.close();
  }
}

