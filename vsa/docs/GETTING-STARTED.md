# Getting Started with VSA

Welcome to the Vertical Slice Architecture (VSA) Manager! This guide will help you get started building event-sourced applications with proper architectural boundaries.

## What is VSA?

**Vertical Slice Architecture** organizes code by business features (slices) rather than technical layers. Each slice contains everything needed for that feature - commands, events, handlers, aggregates, and tests.

### Traditional Layered Architecture ❌

```
controllers/
  ├── UserController
  ├── ProductController
  └── OrderController
services/
  ├── UserService
  ├── ProductService
  └── OrderService
repositories/
  ├── UserRepository
  ├── ProductRepository
  └── OrderRepository
```

**Problems:**
- Changes ripple across layers
- Hard to understand a complete feature
- Difficult to work in parallel
- Tight coupling

### Vertical Slice Architecture ✅

```
contexts/
  └── orders/
      ├── place-order/         # Complete feature!
      │   ├── PlaceOrderCommand.ts
      │   ├── OrderPlacedEvent.ts
      │   ├── PlaceOrderHandler.ts
      │   ├── OrderAggregate.ts
      │   └── PlaceOrder.test.ts
      └── cancel-order/        # Another complete feature!
```

**Benefits:**
- Each feature is self-contained
- Easy to understand and modify
- Teams can work in parallel
- Loose coupling

## Installation

### 1. Install VSA CLI

```bash
# From source (Rust required)
cd vsa/vsa-cli
cargo build --release
sudo cp target/release/vsa /usr/local/bin/

# Verify installation
vsa --version
```

### 2. Install VS Code Extension (Optional)

```bash
cd vsa/vscode-extension
npm install
npm run package
code --install-extension vsa-vscode-0.1.0.vsix
```

## Quick Start

### Create a New Project

```bash
# Create project directory
mkdir my-vsa-project
cd my-vsa-project

# Initialize VSA
vsa init --language typescript

# This creates:
# - vsa.yaml (configuration)
# - src/contexts/ (root for vertical slices)
```

### Configure Your Project

Edit `vsa.yaml`:

```yaml
version: 1
language: typescript
root: src/contexts

# Optional: Framework integration
framework:
  name: event-sourcing-platform
  aggregate_class: AutoDispatchAggregate
  aggregate_import: "@event-sourcing-platform/typescript"

# Bounded contexts
bounded_contexts:
  - name: orders
    description: Order management

# Validation rules
validation:
  require_tests: true
  require_handler: true
```

### Generate Your First Feature

```bash
# Generate a feature with scaffolding
vsa generate orders place-order

# Creates:
# src/contexts/orders/place-order/
#   ├── PlaceOrderCommand.ts
#   ├── OrderPlacedEvent.ts
#   ├── PlaceOrderHandler.ts
#   └── PlaceOrder.test.ts
```

### Implement Business Logic

Edit the generated handler:

```typescript
// place-order/PlaceOrderHandler.ts
export class PlaceOrderHandler {
  constructor(private eventStore: EventStore) {}

  async handle(command: PlaceOrderCommand): Promise<void> {
    // 1. Validate
    if (!command.items || command.items.length === 0) {
      throw new Error('Order must have items');
    }

    // 2. Create event
    const event: OrderPlacedEvent = {
      orderId: command.orderId,
      customerId: command.customerId,
      items: command.items,
      totalAmount: this.calculateTotal(command.items),
      placedAt: new Date(),
    };

    // 3. Store event
    await this.eventStore.appendEvent(
      command.orderId,
      'OrderPlaced',
      event
    );
  }
}
```

### Write Tests

```typescript
// place-order/PlaceOrder.test.ts
describe('PlaceOrder', () => {
  it('should place an order successfully', async () => {
    // Arrange
    const eventStore = new InMemoryEventStore();
    const handler = new PlaceOrderHandler(eventStore);
    const command = {
      orderId: 'order-1',
      customerId: 'customer-1',
      items: [{ productId: 'p1', quantity: 2 }],
    };

    // Act
    await handler.handle(command);

    // Assert
    const events = await eventStore.getEvents('order-1');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('OrderPlaced');
  });
});
```

### Validate Your Structure

```bash
# Run validation
vsa validate

# Output:
# ✅ orders/place-order
#    ├─ PlaceOrderCommand.ts
#    ├─ OrderPlacedEvent.ts
#    ├─ PlaceOrderHandler.ts
#    └─ PlaceOrder.test.ts
#
# Summary: 1 valid, 0 errors
```

## Core Workflow

### 1. Plan Your Feature

- What command triggers it?
- What event(s) are emitted?
- What business rules apply?

### 2. Generate Scaffolding

```bash
vsa generate <context> <feature>
```

### 3. Implement Business Logic

- Write tests first (TDD)
- Implement handler
- Add validation
- Create aggregate (if needed)

### 4. Validate & Run Tests

```bash
vsa validate
npm test
```

### 5. Commit

```bash
git add src/contexts/<context>/<feature>
git commit -m "feat: implement <feature>"
```

## Project Structure

### Basic Structure

```
my-project/
├── vsa.yaml                 # Configuration
├── package.json
├── src/
│   ├── contexts/
│   │   └── orders/
│   │       └── place-order/ # Vertical slice
│   └── infrastructure/
│       ├── EventStore.ts
│       └── CommandBus.ts
└── tests/
    └── integration/
```

### With Bounded Contexts

```
my-project/
├── vsa.yaml
├── src/
│   ├── contexts/
│   │   ├── catalog/         # Context 1
│   │   │   └── add-product/
│   │   ├── orders/          # Context 2
│   │   │   ├── place-order/
│   │   │   └── _subscribers/
│   │   └── shipping/        # Context 3
│   │       └── create-shipment/
│   └── _shared/
│       └── integration-events/  # Single source of truth
└── tests/
```

## Naming Conventions

VSA uses **Convention over Configuration**:

### File Naming

- Commands: `*Command.ts` (e.g., `PlaceOrderCommand.ts`)
- Events: `*Event.ts` (e.g., `OrderPlacedEvent.ts`)
- Handlers: `*Handler.ts` (e.g., `PlaceOrderHandler.ts`)
- Aggregates: `*Aggregate.ts` (e.g., `OrderAggregate.ts`)
- Tests: `*.test.ts` (e.g., `PlaceOrder.test.ts`)

### Folder Naming

- Features: kebab-case (e.g., `place-order/`)
- Contexts: kebab-case (e.g., `order-management/`)
- Subscribers: `_subscribers/` (underscore prefix)
- Shared: `_shared/` (underscore prefix)

## CLI Commands

### Initialize

```bash
vsa init [options]
  --language <lang>        typescript, python, or rust
  --non-interactive        Use defaults
```

### Generate

```bash
vsa generate <context> <feature> [options]
  --interactive            Prompt for details
  --with-aggregate         Include aggregate
```

### Validate

```bash
vsa validate [options]
  --watch                  Re-validate on changes
  --fix                    Auto-fix issues (future)
```

### List

```bash
vsa list [options]
  --by-context             Group by context
  --tree                   Tree view
```

### Manifest

```bash
vsa manifest [options]
  --output <file>          Output file path
```

## Next Steps

### Tutorials

1. **[Example 1: Todo List](../examples/01-todo-list-ts/)** (⭐ Beginner)
   - Learn VSA basics
   - Event sourcing fundamentals
   - CQRS pattern

2. **[Example 2: Library Management](../examples/02-library-management-ts/)** (⭐⭐ Intermediate)
   - Bounded contexts
   - Integration events
   - Event subscribers

3. **[Example 3: E-commerce Platform](../examples/03-ecommerce-platform-ts/)** (⭐⭐⭐ Advanced)
   - Saga orchestration
   - Complex workflows
   - Production patterns

### Guides

- [Core Concepts](./CORE-CONCEPTS.md) - Deep dive into VSA concepts
- [Advanced Patterns](./ADVANCED-PATTERNS.md) - Sagas, CQRS, Event Sourcing
- [Testing Strategies](./TESTING-STRATEGIES.md) - How to test vertical slices

### Resources

- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS](https://martinfowler.com/bliki/CQRS.html)
- [Domain-Driven Design](https://domainlanguage.com/ddd/)

## Common Issues

### VSA Command Not Found

```bash
# Add to PATH
export PATH=$PATH:/path/to/vsa/target/release

# Or copy to /usr/local/bin
sudo cp target/release/vsa /usr/local/bin/
```

### Validation Errors

```bash
# See detailed errors
vsa validate --verbose

# Watch mode for instant feedback
vsa validate --watch
```

### Import Errors

Use the VS Code extension for auto-completion and quick fixes!

## Getting Help

- **Issues:** https://github.com/neuralempowerment/event-sourcing-platform/issues
- **Discussions:** https://github.com/neuralempowerment/event-sourcing-platform/discussions
- **Examples:** Check the `examples/` directory

## What's Next?

Now that you understand the basics, explore:

1. ✅ **Core Concepts** - Learn about bounded contexts, integration events
2. ✅ **Examples** - Study working applications
3. ✅ **Advanced Patterns** - Master sagas and CQRS
4. ✅ **Build Something** - Apply VSA to your project!

Happy coding! 🚀

