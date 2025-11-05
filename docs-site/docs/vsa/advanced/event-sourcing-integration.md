---
sidebar_position: 1
---

# Event Sourcing Integration

Integrate VSA with event sourcing frameworks and event stores.

## Overview

VSA works seamlessly with event sourcing patterns. This guide shows how to integrate with the event-sourcing-platform or other event stores.

## Why Event Sourcing with VSA?

**Natural Fit:**
- Commands → Events mapping
- Aggregates enforce business rules
- Temporal queries and audit trails
- Event-driven architecture
- Testability and replay

## Architecture

```
Command → Handler → Aggregate → Events → Event Store
                         ↓
                    Business Rules
```

## Configuration

### vsa.yaml

```yaml
version: 1
language: typescript
root: src/contexts

framework:
  name: event-sourcing-platform
  aggregate_class: AutoDispatchAggregate
  aggregate_import: "@event-sourcing-platform/typescript"

bounded_contexts:
  - name: orders
    description: Order processing
```

## Implementation

### Event Store Adapter

```typescript
// src/infrastructure/EventStoreAdapter.ts
import { EventStoreClient } from '@event-sourcing-platform/sdk-ts';

export class EventStoreAdapter {
  private client: EventStoreClient;

  constructor(connectionString: string) {
    this.client = new EventStoreClient(connectionString);
  }

  async append(aggregateId: string, events: any[]): Promise<void> {
    await this.client.appendEvents(aggregateId, events);
  }

  async load(aggregateId: string): Promise<any[]> {
    return await this.client.loadEvents(aggregateId);
  }
}
```

### Handler with Event Store

```typescript
// contexts/orders/place-order/PlaceOrderHandler.ts
import { EventStoreAdapter } from '../../../infrastructure/EventStoreAdapter';
import { OrderAggregate } from './OrderAggregate';

export class PlaceOrderHandler {
  constructor(private eventStore: EventStoreAdapter) {}

  async handle(command: PlaceOrderCommand): Promise<void> {
    // 1. Load aggregate from event store
    const aggregate = new OrderAggregate();
    const events = await this.eventStore.load(command.orderId);
    
    // 2. Replay events
    for (const event of events) {
      aggregate.apply(event);
    }
    
    // 3. Execute command
    aggregate.placeOrder(command);
    
    // 4. Persist new events
    const newEvents = aggregate.getUncommittedEvents();
    await this.eventStore.append(command.orderId, newEvents);
  }
}
```

## Testing

### Unit Tests (In-Memory)

```typescript
class InMemoryEventStore implements EventStoreAdapter {
  private events = new Map<string, any[]>();

  async append(id: string, events: any[]): Promise<void> {
    const existing = this.events.get(id) || [];
    this.events.set(id, [...existing, ...events]);
  }

  async load(id: string): Promise<any[]> {
    return this.events.get(id) || [];
  }
}

describe('PlaceOrder', () => {
  it('should place order', async () => {
    const eventStore = new InMemoryEventStore();
    const handler = new PlaceOrderHandler(eventStore);
    
    await handler.handle(command);
    
    const events = await eventStore.load(command.orderId);
    expect(events).toHaveLength(1);
  });
});
```

### Integration Tests (Real Event Store)

```typescript
describe('PlaceOrder Integration', () => {
  let eventStore: EventStoreAdapter;

  beforeAll(async () => {
    eventStore = new EventStoreAdapter('localhost:50051');
  });

  it('should persist to event store', async () => {
    const handler = new PlaceOrderHandler(eventStore);
    await handler.handle(command);
    
    const events = await eventStore.load(command.orderId);
    expect(events[0].type).toBe('OrderPlaced');
  });
});
```

## Next Steps

- [Testing Strategies](./testing-strategies) - Comprehensive testing
- [Bounded Context Patterns](./bounded-context-patterns) - Advanced patterns
- [Examples](../examples/overview) - See it in action

---

More advanced topics coming soon!

