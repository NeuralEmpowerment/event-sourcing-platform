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

### Complete Application Examples (ADR-004 Compliant)

| Example                    | Status | Concept                                             |
| -------------------------- | ------ | --------------------------------------------------- |
| **007-inventory-complete-ts**  | ✅     | Inventory management with stock tracking            |
| **007-ecommerce-complete-ts**  | ✅     | E-commerce (Product/Order/Customer aggregates)      |
| **008-banking-complete-ts**    | ✅     | Banking system (Account/Transfer/Customer)          |
| **008-observability-ts**       | ✅     | System monitoring with structured logging           |
| **009-web-dashboard-ts**       | ✅     | Live Express dashboard with real-time data          |

**All complete examples demonstrate:**
- ✅ **ADR-004 Compliant:** Command handlers integrated in aggregates
- ✅ Full aggregate lifecycle management
- ✅ Business rule validation
- ✅ State machines (where applicable)
- ✅ Complete end-to-end flows

## Learning Path

### Level 1: Foundations (Start Here)

**001-basic-store-ts** - Event Store Basics
- Direct event store operations
- Append and read events
- Stream management

**002-simple-aggregate-ts** - Your First Aggregate
- `@Aggregate` decorator
- `@CommandHandler` for business logic
- `@EventSourcingHandler` for state
- Repository pattern

### Level 2: Core Patterns

**003-multiple-aggregates-ts** - Multiple Aggregates
- Customer and Order aggregates
- Cross-aggregate references
- Independent lifecycles

**004-cqrs-patterns-ts** - CQRS Separation
- Command side (write model)
- Query side (read models)
- Event-driven projections

**005-projections-ts** - Advanced Projections
- Multiple projections from same events
- Analytics and reporting
- Real-time updates

**006-event-bus-ts** - Event-Driven Architecture
- Event bus implementation
- Subscribers and handlers
- Integration events

### Level 3: Complete Applications

**007-inventory-complete-ts** - Inventory Management
- Stock tracking and reorder points
- Product aggregate with 4 commands
- Business rule validation

**007-ecommerce-complete-ts** - E-Commerce Platform
- Product, Order, Customer aggregates
- Complete order flow
- Order status state machine

**008-banking-complete-ts** - Banking System
- Account, Transfer, Customer aggregates
- Balance validation and transfers
- Account/Transfer state machines

**008-observability-ts** - Production Monitoring
- Structured logging with Pino
- Multiple aggregates with DI
- Error tracking and metrics

**009-web-dashboard-ts** - Live Dashboard
- Express.js web interface
- Real-time data visualization
- Product and order management

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
