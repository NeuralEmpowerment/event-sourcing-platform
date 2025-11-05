# Examples Overview

Progressive learning path for event sourcing with TypeScript, demonstrating patterns from basic concepts to production-ready applications.

## Running Examples

All TypeScript examples default to the local dev-tools gRPC event store. Start the stack with `./dev-tools/dev start`. To run any example against the in-memory client, append `-- --memory` to the `pnpm run start` invocation.

### Quick Smoke Test

```bash
make examples-run
```

The target builds and runs each example sequentially using the gRPC backend.

### Individual Examples

```bash
# Example 001: Basic event store
pnpm --filter ./examples/001-basic-store-ts run start

# Example 002: Simple aggregate with @CommandHandler
pnpm --filter ./examples/002-simple-aggregate-ts run start

# ... and so on
```

## Catalogue

### Core Examples (Production-Ready Patterns)

| Example                    | Status | Concept                                             |
| -------------------------- | ------ | --------------------------------------------------- |
| **001-basic-store-ts**         | ✅     | Raw event store usage (append/read/exists)          |
| **002-simple-aggregate-ts**    | ✅     | `@Aggregate` and `@CommandHandler` decorators       |
| **003-multiple-aggregates-ts** | ✅     | Multiple aggregates with `@CommandHandler`          |
| **004-cqrs-patterns-ts**       | ✅     | Command/Query separation with read models           |
| **005-projections-ts**         | ✅     | Event-driven projections and analytics              |
| **006-event-bus-ts**           | ✅     | Cross-aggregate communication via events            |
| **010-observability-ts**       | ✅     | Structured logging with Pino, DI patterns           |

### Example Pattern Highlights

**All examples (002-010) demonstrate:**
- ✅ Commands as classes with `aggregateId` property
- ✅ `@CommandHandler` decorators on aggregate methods
- ✅ `@EventSourcingHandler` decorators for state updates
- ✅ Clear separation: command handlers validate, event handlers mutate
- ✅ No separate handler classes needed
- ✅ Repository pattern for loading/saving aggregates
- ✅ Optimistic concurrency control

### Work in Progress

| Example                    | Status | Concept                                             |
| -------------------------- | ------ | --------------------------------------------------- |
| 007-inventory-complete-ts  | 🔄     | Complete inventory management system                 |
| 007-ecommerce-complete-ts  | 🔄     | E-commerce with multiple bounded contexts           |
| 008-banking-complete-ts    | 🔄     | Banking system with compliance                      |
| 008-observability-ts       | 🔄     | System monitoring and health metrics (legacy)       |
| 009-web-dashboard-ts       | 🔄     | Live HTML dashboard showing projections             |

## Learning Path

### 1. Start Here: Event Store Basics

**Example 001** - Learn direct event store operations:
- Append events to streams
- Read events back
- Stream existence checking
- Raw event store API

### 2. Aggregates & Commands

**Example 002** - Your first aggregate:
- `@Aggregate` decorator
- `@CommandHandler` for business logic
- `@EventSourcingHandler` for state
- Repository pattern

### 3. Multiple Aggregates

**Example 003** - Working with multiple aggregates:
- Customer and Order aggregates
- Cross-aggregate references
- Independent lifecycles
- Consistent command pattern

### 4. CQRS Patterns

**Example 004** - Separate reads from writes:
- Command side (write model)
- Query side (read models)
- Event-driven projections
- Denormalized views

### 5. Advanced Projections

**Example 005** - Build analytics:
- Multiple projections from same events
- Sales reports
- Product catalogs
- Real-time updates

### 6. Event Bus & Integration

**Example 006** - Cross-context communication:
- Event bus implementation
- Subscribers and handlers
- Integration events
- Loose coupling

### 7. Observability & Logging

**Example 010** - Production-ready logging:
- Structured logging with Pino
- Dependency injection
- Context propagation
- Command tracing
- Error tracking

## Key Patterns

### Command Pattern (Examples 002-010)

```typescript
// Command as class with aggregateId
class PlaceOrderCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly customerId: string,
    public readonly items: Item[]
  ) {}
}

// Aggregate with @CommandHandler
@Aggregate('Order')
class OrderAggregate extends AggregateRoot<OrderEvent> {
  @CommandHandler('PlaceOrderCommand')
  placeOrder(command: PlaceOrderCommand): void {
    // 1. Validate
    if (!command.items.length) throw new Error('No items');
    
    // 2. Initialize (for new aggregates)
    this.initialize(command.aggregateId);
    
    // 3. Emit event
    this.apply(new OrderPlacedEvent(...));
  }
  
  @EventSourcingHandler('OrderPlaced')
  private onOrderPlaced(event: OrderPlacedEvent): void {
    // Only update state
    this.status = 'Placed';
  }
}
```

### Repository Pattern (Examples 002-010)

```typescript
const factory = new RepositoryFactory(eventStoreClient);
const repository = factory.createRepository(
  () => new OrderAggregate(),
  'Order'
);

// Load or create
let aggregate = await repository.load(orderId) || new OrderAggregate();

// Handle command
aggregate.handleCommand(command);

// Save with optimistic concurrency
await repository.save(aggregate);
```

## Possible Future Examples

Additional examples that could be implemented:

| Example                    | Concept                                             |
| -------------------------- | --------------------------------------------------- |
| 011-sagas-ts               | Long-running processes and saga patterns           |
| 012-multi-tenant-ts        | Multi-tenant event sourcing architecture           |
| 013-event-versioning-ts    | Event schema evolution and upcasting               |
| 014-performance-ts         | Performance optimization and benchmarking          |
| 015-testing-patterns-ts    | Comprehensive testing strategies                   |

## Documentation

- **[VSA + Event Sourcing Guide](../docs-site/docs/guides/vsa-event-sourcing-guide.md)** - Complete integration guide
- **[Event Sourcing Patterns](../docs-site/docs/event-sourcing/)** - Core concepts
- **[VSA Architecture](../docs-site/docs/vsa/)** - Vertical Slice Architecture
- **[CLAUDE.md](../CLAUDE.md)** - AI agent guidance

## Contributing

When adding new examples:

1. Follow the numbering scheme (001, 002, ...)
2. Use `@CommandHandler` pattern consistently
3. Include comprehensive README in example directory
4. Add entry to this catalogue
5. Update Makefile with `examples-NNN` target
6. Ensure example works with `--memory` flag
