/**
 * Library Management Application
 * 
 * This file wires together all bounded contexts and infrastructure
 */

import { EventStoreAdapter } from './infrastructure/EventStoreAdapter';
import { CommandBus } from './infrastructure/CommandBus';
import { EventBus } from './infrastructure/EventBus';

// Catalog context
import { AddBookHandler } from './contexts/catalog/add-book/AddBookHandler';
import { RemoveBookHandler } from './contexts/catalog/remove-book/RemoveBookHandler';

// Lending context
import { BorrowBookHandler } from './contexts/lending/borrow-book/BorrowBookHandler';
import { ReturnBookHandler } from './contexts/lending/return-book/ReturnBookHandler';
import { MarkOverdueHandler } from './contexts/lending/mark-overdue/MarkOverdueHandler';

// Notifications context
import { SendNotificationHandler } from './contexts/notifications/send-notification/SendNotificationHandler';
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

  private registerHandlers(): void {
    // Catalog context handlers
    this.commandBus.register('AddBook', new AddBookHandler(this.eventStore, this.eventBus));
    this.commandBus.register('RemoveBook', new RemoveBookHandler(this.eventStore, this.eventBus));

    // Lending context handlers
    this.commandBus.register('BorrowBook', new BorrowBookHandler(this.eventStore, this.eventBus));
    this.commandBus.register('ReturnBook', new ReturnBookHandler(this.eventStore, this.eventBus));
    this.commandBus.register('MarkOverdue', new MarkOverdueHandler(this.eventStore, this.eventBus));

    // Notifications context handlers
    this.commandBus.register('SendNotification', new SendNotificationHandler(this.eventStore));
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

