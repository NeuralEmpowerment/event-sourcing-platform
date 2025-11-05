---
sidebar_position: 2
---

# Quick Start

Build your first VSA project in 10 minutes. This guide walks you through creating a simple order management system using Vertical Slice Architecture.

## What You'll Build

A simple order management system with:
- Place order feature (command → event → handler)
- Event sourcing integration
- Comprehensive tests
- Proper VSA structure

## Step 1: Create a New Project

```bash
# Create and enter project directory
mkdir order-system
cd order-system

# Initialize VSA with TypeScript
vsa init --language typescript

# Install dependencies
npm install
```

This creates:

```
order-system/
├── vsa.yaml           # VSA configuration
├── package.json
└── src/
    └── contexts/      # Root for vertical slices
```

## Step 2: Configure Your Project

Edit `vsa.yaml`:

```yaml
version: 1
language: typescript
root: src/contexts

# Define your first bounded context
bounded_contexts:
  - name: orders
    description: Order management and processing
    publishes: []
    subscribes: []

# Validation rules
validation:
  require_tests: true
  require_handler: true
  require_aggregate: false
```

## Step 3: Generate Your First Feature

```bash
# Generate the place-order feature
vsa generate orders place-order
```

This creates a complete vertical slice:

```
src/contexts/orders/place-order/
├── PlaceOrderCommand.ts     # What we want to do
├── OrderPlacedEvent.ts      # What happened
├── PlaceOrderHandler.ts     # Business logic
└── PlaceOrder.test.ts       # Tests
```

## Step 4: Implement the Command

Edit `src/contexts/orders/place-order/PlaceOrderCommand.ts`:

```typescript
export interface PlaceOrderCommand {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}
```

## Step 5: Define the Event

Edit `src/contexts/orders/place-order/OrderPlacedEvent.ts`:

```typescript
export interface OrderPlacedEvent {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  placedAt: Date;
}
```

## Step 6: Implement Business Logic

First, install the event-sourcing platform SDK:

```bash
npm install @event-sourcing-platform/sdk-ts
```

Create the aggregate `src/contexts/orders/place-order/OrderAggregate.ts`:

```typescript
import { AutoDispatchAggregate, BaseDomainEvent } from '@event-sourcing-platform/sdk-ts';
import { OrderPlacedEvent } from './OrderPlacedEvent';

@AutoDispatchAggregate()
export class OrderAggregate {
  private orderId: string = '';
  private customerId: string = '';
  private items: Array<{ productId: string; quantity: number; price: number }> = [];
  private totalAmount: number = 0;
  private placedAt?: Date;

  // Apply the OrderPlacedEvent
  applyOrderPlacedEvent(event: OrderPlacedEvent): void {
    this.orderId = event.orderId;
    this.customerId = event.customerId;
    this.items = event.items;
    this.totalAmount = event.totalAmount;
    this.placedAt = event.placedAt;
  }

  // Getters
  getOrderId(): string { return this.orderId; }
  getCustomerId(): string { return this.customerId; }
  getItems() { return this.items; }
  getTotalAmount(): number { return this.totalAmount; }
  getPlacedAt(): Date | undefined { return this.placedAt; }
}
```

Now implement the handler `src/contexts/orders/place-order/PlaceOrderHandler.ts`:

```typescript
import { PlaceOrderCommand } from './PlaceOrderCommand';
import { OrderPlacedEvent } from './OrderPlacedEvent';
import { OrderAggregate } from './OrderAggregate';
import { IEventStore } from '../../../infrastructure/EventStore';

export class PlaceOrderHandler {
  constructor(private eventStore: IEventStore) {}

  async handle(command: PlaceOrderCommand): Promise<void> {
    // Validate command
    if (!command.items || command.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    if (!command.customerId) {
      throw new Error('Customer ID is required');
    }

    // Calculate total
    const totalAmount = command.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Create event
    const event: OrderPlacedEvent = {
      orderId: command.orderId,
      customerId: command.customerId,
      items: command.items,
      totalAmount,
      placedAt: new Date(),
    };

    // Create aggregate and apply event
    const aggregate = new OrderAggregate();
    aggregate.applyOrderPlacedEvent(event);

    // Persist to event store
    await this.eventStore.save(command.orderId, [event]);
  }
}
```

:::tip Integration with Event Sourcing Platform

The `@AutoDispatchAggregate()` decorator automatically dispatches events to the correct `apply` method based on the event type. This pattern ensures:

- **Type Safety**: Events are strongly typed
- **Consistency**: All state changes go through events
- **Auditability**: Full event history is preserved
- **Replayability**: Aggregates can be rebuilt from events

:::

:::info Why Use Aggregates?

Even though this example is simple, using aggregates from the start ensures:

1. **Scalability** - Easy to add more events later
2. **Testability** - Can test state transitions in isolation  
3. **Event Sourcing** - Full audit trail of all changes
4. **CQRS** - Separate write model (aggregates) from read models

:::


## Step 7: Write Tests

Edit `src/contexts/orders/place-order/PlaceOrder.test.ts`:

```typescript
import { PlaceOrderHandler } from './PlaceOrderHandler';
import { PlaceOrderCommand } from './PlaceOrderCommand';
import { OrderAggregate } from './OrderAggregate';
import { InMemoryEventStore } from '../../../infrastructure/InMemoryEventStore';

describe('PlaceOrder', () => {
  let handler: PlaceOrderHandler;
  let eventStore: InMemoryEventStore;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
    handler = new PlaceOrderHandler(eventStore);
  });

  it('should place an order successfully', async () => {
    // Arrange
    const command: PlaceOrderCommand = {
      orderId: 'order-123',
      customerId: 'customer-456',
      items: [
        { productId: 'product-1', quantity: 2, price: 10.0 },
        { productId: 'product-2', quantity: 1, price: 15.0 },
      ],
    };

    // Act
    await handler.handle(command);

    // Assert - Load from event store
    const events = await eventStore.load('order-123');
    expect(events).toHaveLength(1);
    
    const event = events[0];
    expect(event.orderId).toBe('order-123');
    expect(event.customerId).toBe('customer-456');
    expect(event.items).toHaveLength(2);
    expect(event.totalAmount).toBe(35.0); // (2 * 10) + (1 * 15)
    expect(event.placedAt).toBeInstanceOf(Date);
  });

  it('should rebuild aggregate from events', async () => {
    // Arrange & Act
    const command: PlaceOrderCommand = {
      orderId: 'order-123',
      customerId: 'customer-456',
      items: [{ productId: 'product-1', quantity: 2, price: 10.0 }],
    };
    await handler.handle(command);

    // Rebuild aggregate from events
    const events = await eventStore.load('order-123');
    const aggregate = new OrderAggregate();
    events.forEach(event => aggregate.applyOrderPlacedEvent(event));

    // Assert
    expect(aggregate.getOrderId()).toBe('order-123');
    expect(aggregate.getCustomerId()).toBe('customer-456');
    expect(aggregate.getTotalAmount()).toBe(20.0);
  });

  it('should reject orders with no items', async () => {
    // Arrange
    const command: PlaceOrderCommand = {
      orderId: 'order-123',
      customerId: 'customer-456',
      items: [],
    };

    // Act & Assert
    await expect(handler.handle(command)).rejects.toThrow(
      'Order must contain at least one item'
    );
  });

  it('should reject orders without customer', async () => {
    // Arrange
    const command: PlaceOrderCommand = {
      orderId: 'order-123',
      customerId: '',
      items: [{ productId: 'product-1', quantity: 1, price: 10.0 }],
    };

    // Act & Assert
    await expect(handler.handle(command)).rejects.toThrow(
      'Customer ID is required'
    );
  });
});
```

:::tip Testing Event-Sourced Systems

Notice how the tests verify:

1. **Events are persisted** - Check the event store
2. **Aggregates can be rebuilt** - Load events and replay
3. **Business rules are enforced** - Validation errors work

This pattern ensures your event-sourced system is correct and maintainable.

:::

## Step 8: Validate Your Structure

```bash
# Run VSA validation
vsa validate
```

Expected output:

```
✅ Validating: src/contexts

📦 Context: orders
  ✅ place-order
     ├─ PlaceOrderCommand.ts
     ├─ OrderPlacedEvent.ts
     ├─ PlaceOrderHandler.ts
     └─ PlaceOrder.test.ts

✅ Summary: 1 feature validated, 0 errors
```

## Step 9: Run Tests

```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest

# Configure Jest (if needed)
npx ts-jest config:init

# Run tests
npm test
```

Expected output:

```
 PASS  src/contexts/orders/place-order/PlaceOrder.test.ts
  PlaceOrder
    ✓ should place an order successfully (5 ms)
    ✓ should reject orders with no items (2 ms)
    ✓ should reject orders without customer (1 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

## Step 10: Enable Watch Mode (Optional)

For real-time validation while developing:

```bash
# Terminal 1: Run tests in watch mode
npm test -- --watch

# Terminal 2: Run VSA validation in watch mode
vsa validate --watch
```

Now any file changes will trigger automatic validation and tests!

## Project Structure Review

Your project now looks like this:

```
order-system/
├── vsa.yaml
├── package.json
├── jest.config.js
└── src/
    └── contexts/
        └── orders/
            └── place-order/
                ├── PlaceOrderCommand.ts
                ├── OrderPlacedEvent.ts
                ├── PlaceOrderHandler.ts
                └── PlaceOrder.test.ts
```

## Understanding the Vertical Slice

Each feature is a **complete vertical slice**:

1. **Command** (`PlaceOrderCommand.ts`) - Defines what we want to do
2. **Event** (`OrderPlacedEvent.ts`) - Defines what happened
3. **Handler** (`PlaceOrderHandler.ts`) - Contains business logic
4. **Test** (`PlaceOrder.test.ts`) - Verifies behavior

This is different from traditional layered architecture where you'd have:
- Commands in one directory
- Events in another
- Handlers in a third
- Tests scattered everywhere

With VSA, **everything for one feature is in one place**!

## Key Benefits You Just Experienced

✅ **Fast Scaffolding** - `vsa generate` created all files instantly

✅ **Validated Structure** - `vsa validate` ensures consistency

✅ **Self-Contained** - All feature code in one directory

✅ **Easy to Test** - Tests live with the code they test

✅ **Clear Intent** - File names tell you exactly what they do

## Next Steps

### Add More Features

```bash
# Generate another feature
vsa generate orders cancel-order

# Validate
vsa validate
```

### Add Event Sourcing

Integrate with the event store:

```bash
npm install @event-sourcing-platform/sdk-ts
```

See [Event Sourcing Integration](../advanced/event-sourcing-integration) for details.

### Add More Contexts

Edit `vsa.yaml` to add bounded contexts:

```yaml
bounded_contexts:
  - name: orders
    description: Order management
  - name: shipping
    description: Shipment processing
  - name: inventory
    description: Stock management
```

### Explore Examples

Check out complete working examples:

- **[Todo List](../examples/todo-list)** - Simple single-context app
- **[Library Management](../examples/library-management)** - Multi-context with integration events
- **[E-commerce Platform](../examples/ecommerce-platform)** - Complex workflows with sagas

## Common Next Actions

### List All Features

```bash
vsa list
```

### Generate Manifest

```bash
vsa manifest --output ARCHITECTURE.md
```

### Watch Mode During Development

```bash
# Keep this running while coding
vsa validate --watch
```

## What You Learned

In this quick start, you:

1. ✅ Created a VSA project
2. ✅ Configured bounded contexts
3. ✅ Generated a vertical slice
4. ✅ Implemented business logic
5. ✅ Wrote comprehensive tests
6. ✅ Validated architecture
7. ✅ Understood VSA benefits

## Troubleshooting

### Validation Fails

```bash
# Get detailed output
vsa validate --verbose

# Check for naming conventions
# Commands: *Command.ts
# Events: *Event.ts
# Handlers: *Handler.ts
# Tests: *.test.ts
```

### Tests Fail

```bash
# Ensure Jest is configured
npx ts-jest config:init

# Check package.json has test script
npm run test
```

### Import Errors

Use relative imports within the same slice:

```typescript
import { PlaceOrderCommand } from './PlaceOrderCommand';
import { OrderPlacedEvent } from './OrderPlacedEvent';
```

## Resources

- **[Your First Feature](./your-first-feature)** - Deeper dive into feature development
- **[CLI Commands](../cli/commands)** - All available commands
- **[Core Concepts](../concepts/vertical-slices)** - Understanding VSA principles

---

**Congratulations!** 🎉 You've built your first VSA feature. Continue to [Your First Feature](./your-first-feature) for a deeper understanding.

