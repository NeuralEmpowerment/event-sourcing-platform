# Library Management System - VSA Example (⭐⭐ Intermediate)

A library management system demonstrating **Bounded Contexts**, **Integration Events**, and **Event-Driven Architecture**.

## 🎯 What You'll Learn

- ✅ **ADR-004 COMPLIANT:** Command handlers integrated in aggregates using `@CommandHandler` decorators
- ✅ Multiple bounded contexts (Catalog, Lending, Notifications)
- ✅ Integration events (single source of truth)
- ✅ Event subscribers for cross-context communication
- ✅ Bounded context boundaries
- ✅ Event bus pattern
- ✅ Three aggregates demonstrating the correct pattern:
  - `BookAggregate` - Catalog management
  - `LoanAggregate` - Book lending lifecycle
  - `NotificationAggregate` - Member notifications

## 📋 Features

### Catalog Context - `BookAggregate`
- **Add Book** (`@CommandHandler`) - Add books to the library catalog
- **Remove Book** (`@CommandHandler`) - Remove books from catalog
- Publishes: `BookAdded`, `BookRemoved`
- **✅ ADR-004 Compliant:** Uses `@Aggregate` and `@CommandHandler` decorators

### Lending Context - `LoanAggregate`
- **Borrow Book** (`@CommandHandler`) - Check out books to members
- **Return Book** (`@CommandHandler`) - Return borrowed books
- **Mark Overdue** (`@CommandHandler`) - Mark late returns as overdue
- Publishes: `BookBorrowed`, `BookReturned`, `BookOverdue`
- Subscribes to: `BookAdded`, `BookRemoved`
- **✅ ADR-004 Compliant:** Uses `@Aggregate` and `@CommandHandler` decorators

### Notifications Context - `NotificationAggregate`
- **Send Notification** (`@CommandHandler`) - Send notifications to members
- Types: Borrow Confirmation, Return Confirmation, Overdue Alert
- Subscribes to: `BookBorrowed`, `BookReturned`, `BookOverdue`
- **✅ ADR-004 Compliant:** Uses `@Aggregate` and `@CommandHandler` decorators

## 🏗️ Architecture

### Bounded Contexts

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   CATALOG    │────────▶│   LENDING    │────────▶│NOTIFICATIONS │
│              │         │              │         │              │
│ - Add Book   │         │ - Borrow     │         │ - Send Email │
│ - Remove     │         │ - Return     │         │ - Send SMS   │
└──────────────┘         └──────────────┘         └──────────────┘
      │                        │                         ▲
      │  BookAdded             │  BookBorrowed           │
      │  BookRemoved           │  BookReturned           │
      └────────────────────────┴─────────────────────────┘
                    Integration Events (Event Bus)
```

### Integration Events Flow

1. **Catalog → Lending**
   - `BookAdded`: When a book is added to catalog, lending context is notified
   - `BookRemoved`: When a book is removed, lending context marks it unavailable

2. **Lending → Notifications**
   - `BookBorrowed`: Triggers borrow confirmation notification
   - `BookReturned`: Triggers return confirmation
   - `BookOverdue`: Triggers overdue alert

### Single Source of Truth

All integration events are defined in `_shared/integration-events/`:

```typescript
// src/_shared/integration-events/catalog/BookAdded.ts
export interface BookAdded {
  bookId: string;
  isbn: string;
  title: string;
  author: string;
  addedAt: Date;
}
```

This ensures **no duplication** - all contexts use the same event definition!

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- VSA CLI (optional)

### Installation

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d postgres

# Build the project
npm run build
```

### Running the Application

```bash
# Start the REST API
npm start

# Or in development mode with hot reload
npm run dev
```

The API will be available at `http://localhost:3000`

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 📁 Project Structure

```
02-library-management-ts/
├── vsa.yaml                          # VSA configuration with bounded contexts
├── docker-compose.yml
├── src/
│   ├── contexts/
│   │   ├── catalog/                  # 🔵 Catalog Context
│   │   │   ├── add-book/
│   │   │   │   ├── AddBookCommand.ts
│   │   │   │   ├── BookAddedInCatalogEvent.ts (domain event)
│   │   │   │   ├── AddBookHandler.ts
│   │   │   │   └── AddBook.test.ts
│   │   │   └── remove-book/
│   │   │
│   │   ├── lending/                  # 🟢 Lending Context
│   │   │   ├── borrow-book/
│   │   │   │   ├── BorrowBookCommand.ts
│   │   │   │   ├── BookBorrowedEvent.ts (domain event)
│   │   │   │   ├── BorrowBookHandler.ts
│   │   │   │   └── BorrowBook.test.ts
│   │   │   ├── return-book/
│   │   │   └── _subscribers/         # Event subscribers
│   │   │       ├── BookAddedSubscriber.ts
│   │   │       └── BookRemovedSubscriber.ts
│   │   │
│   │   └── notifications/            # 🟡 Notifications Context
│   │       └── _subscribers/
│   │           ├── BookBorrowedSubscriber.ts
│   │           ├── BookReturnedSubscriber.ts
│   │           └── BookOverdueSubscriber.ts
│   │
│   ├── _shared/
│   │   └── integration-events/       # 🌟 Single source of truth
│   │       ├── catalog/
│   │       │   ├── BookAdded.ts
│   │       │   └── BookRemoved.ts
│   │       └── lending/
│   │           ├── BookBorrowed.ts
│   │           ├── BookReturned.ts
│   │           └── BookOverdue.ts
│   │
│   ├── infrastructure/
│   │   ├── EventBus.ts               # Integration event routing
│   │   ├── EventStore.ts
│   │   └── CommandBus.ts
│   │
│   └── api/
│       ├── server.ts                 # Express server
│       └── routes/
│           ├── catalog.ts
│           ├── lending.ts
│           └── notifications.ts
│
└── tests/
    └── integration/
        └── libraryFlow.test.ts
```

## 🔍 Key Patterns

### 1. ADR-004: Command Handlers in Aggregates

**All three contexts follow ADR-004:**

```typescript
// Example: LoanAggregate
@Aggregate('Loan')
export class LoanAggregate extends AggregateRoot<LoanEvent> {
  private state: LoanState | null = null;

  // Command Handler - validates and applies events
  @CommandHandler('BorrowBookCommand')
  borrowBook(command: BorrowBookCommand): void {
    // 1. Validation
    if (!command.bookId) throw new Error('Book ID required');
    if (this.id !== null) throw new Error('Loan already exists');
    
    // 2. Initialize
    this.initialize(command.aggregateId);
    
    // 3. Apply event
    this.apply(new BookBorrowedEvent(...));
  }

  // Event Sourcing Handler - updates state only
  @EventSourcingHandler('BookBorrowed')
  private onBookBorrowed(event: BookBorrowedEvent): void {
    this.state = { loanId: event.loanId, ... };
  }
}
```

**Key Points:**
- ✅ Commands as classes (not interfaces)
- ✅ `@CommandHandler` decorators for command processing
- ✅ `apply()` method (not `raiseEvent()`)
- ✅ `@EventSourcingHandler` for state updates
- ✅ Validation in command handlers
- ✅ State-only updates in event handlers

### 2. Integration Events (Single Source of Truth)

**Problem:** How do bounded contexts communicate without coupling?

**Solution:** Integration events defined in `_shared/`:

```typescript
// _shared/integration-events/catalog/BookAdded.ts
export interface BookAdded {
  bookId: string;
  title: string;
  // ...
}

// Catalog publishes
await eventBus.publish('BookAdded', event);

// Lending subscribes
eventBus.subscribe('BookAdded', new BookAddedSubscriber());
```

### 3. Event Subscribers

**Pattern:** React to events from other contexts

```typescript
// lending/_subscribers/BookAddedSubscriber.ts
export class BookAddedSubscriber {
  async handle(event: BookAdded): Promise<void> {
    // When catalog adds a book, lending marks it as available
    console.log(`Book available for lending: ${event.title}`);
    
    // Update lending context's read model
    await this.updateAvailableBooks(event);
  }
}
```

### 4. Bounded Context Boundaries

**Rule:** No direct imports between contexts!

❌ **Wrong:**
```typescript
// lending/borrow-book/Handler.ts
import { BookAggregate } from '../../catalog/add-book/BookAggregate';
```

✅ **Correct:**
```typescript
// lending/borrow-book/Handler.ts
import { BookAdded } from '../../../_shared/integration-events/catalog/BookAdded';
```

### 5. Domain Events vs Integration Events

**Domain Events:** Internal to a context
```typescript
// catalog/add-book/BookAddedInCatalogEvent.ts
// Used within catalog context only
```

**Integration Events:** Across contexts
```typescript
// _shared/integration-events/catalog/BookAdded.ts
// Published by catalog, consumed by lending
```

## 🧪 Testing Strategy

### Unit Tests

Test each vertical slice independently:

```typescript
describe('AddBook', () => {
  it('should add a book and publish integration event', async () => {
    const handler = new AddBookHandler(eventStore, eventBus);
    
    await handler.handle({
      bookId: 'book-1',
      title: 'Clean Code',
      author: 'Robert Martin'
    });
    
    // Verify integration event was published
    expect(eventBus.published).toContain('BookAdded');
  });
});
```

### Integration Tests

Test cross-context communication:

```typescript
it('should handle book lifecycle across contexts', async () => {
  // Catalog adds book
  await catalogHandler.addBook({ bookId: 'book-1', title: 'Test' });
  
  // Lending receives event and marks available
  // (automatically via event bus)
  
  // Member borrows book
  await lendingHandler.borrowBook({ bookId: 'book-1', memberId: 'member-1' });
  
  // Notifications receives event
  // (automatically via event bus)
  
  // Verify notification was sent
  expect(notificationsSent).toHaveLength(1);
});
```

## 🌐 REST API

### Catalog Endpoints

```
POST   /api/catalog/books              Add book
DELETE /api/catalog/books/:id          Remove book
GET    /api/catalog/books              List all books
```

### Lending Endpoints

```
POST   /api/lending/borrow             Borrow book
POST   /api/lending/return             Return book
GET    /api/lending/borrowed           List borrowed books
```

### Example Request

```bash
# Add a book
curl -X POST http://localhost:3000/api/catalog/books \
  -H "Content-Type: application/json" \
  -d '{
    "isbn": "978-0132350884",
    "title": "Clean Code",
    "author": "Robert C. Martin"
  }'

# Borrow a book
curl -X POST http://localhost:3000/api/lending/borrow \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "book-1",
    "memberId": "member-1"
  }'
```

## 🎓 Key Concepts Demonstrated

### 1. Bounded Contexts
- Clear boundaries between domains
- Each context has its own models and logic
- Contexts communicate via integration events

### 2. Integration Events
- Single source of truth in `_shared/`
- Asynchronous communication
- Loose coupling between contexts

### 3. Event-Driven Architecture
- Event bus for routing
- Subscribers react to events
- Publish-subscribe pattern

### 4. Context Autonomy
- Each context can work independently
- No shared databases
- No direct dependencies

## 📚 Next Steps

1. **Run the application**: Start the API and try the endpoints
2. **Read the code**: See how contexts communicate via events
3. **Add a feature**: Generate a new vertical slice
4. **Try VSA validation**: Run `vsa validate` to check boundaries
5. **Move to Example 3**: Learn about sagas and complex workflows

## 🔗 Related Examples

- **Previous:** [Example 1 - Todo List](../01-todo-list-ts/) (⭐ Beginner)
- **Next:** [Example 3 - E-commerce Platform](../03-ecommerce-platform-ts/) (⭐⭐⭐ Advanced)

## 📖 Documentation

- [Bounded Contexts](../../docs/bounded-contexts.md)
- [Integration Events](../../docs/integration-events.md)
- [Event-Driven Architecture](../../docs/event-driven-architecture.md)

## ❓ Common Questions

**Q: Why can't contexts call each other directly?**  
A: Direct calls create tight coupling. Integration events allow contexts to evolve independently.

**Q: What if an event subscriber fails?**  
A: Implement retry logic, dead letter queues, or use a message broker like RabbitMQ.

**Q: How do I add a new context?**  
A: Add it to `vsa.yaml`, define its integration events, and implement subscribers.

**Q: Can multiple contexts subscribe to the same event?**  
A: Yes! That's the power of publish-subscribe. Example: Both `Lending` and `Analytics` could subscribe to `BookAdded`.

## 📄 License

MIT

