# E-commerce Platform Architecture (⭐⭐⭐ Advanced)

> **Note:** This is a detailed architectural outline demonstrating production-ready patterns.  
> Use this as a reference for building complex VSA systems with sagas and advanced workflows.

## Overview

A complete e-commerce platform with 5 bounded contexts demonstrating:
- **Saga orchestration** for complex workflows
- **Compensating transactions** for failure handling
- **GraphQL and REST APIs**
- **Next.js frontend**
- **Production deployment patterns**

## Bounded Contexts

### 1. Catalog Context
**Responsibility:** Product information and categorization

**Features:**
- Create/Update/Delete products
- Manage product categories
- Product search and filtering
- Product inventory tracking (quantities)

**Domain Events:**
- `ProductCreated`
- `ProductUpdated`
- `ProductDeleted`
- `CategoryCreated`

**Integration Events Published:**
- `ProductCreated` → Inventory
- `ProductPriceChanged` → Orders

### 2. Inventory Context
**Responsibility:** Stock management and reservations

**Features:**
- Reserve inventory (when order placed)
- Release inventory (when order cancelled)
- Adjust stock levels (restocking)
- Low stock alerts

**Domain Events:**
- `InventoryReserved`
- `InventoryReleased`
- `StockAdjusted`
- `LowStockDetected`

**Integration Events Published:**
- `InventoryReserved` → Orders
- `InventoryReleased` → Orders
- `OutOfStock` → Orders, Catalog

**Integration Events Subscribed:**
- `ProductCreated` (from Catalog)
- `OrderPlaced` (from Orders)
- `OrderCancelled` (from Orders)

### 3. Orders Context (Saga Coordinator)
**Responsibility:** Order processing and saga orchestration

**Features:**
- Place order (initiates saga)
- Cancel order (compensating transaction)
- Track order status
- Order history

**Domain Events:**
- `OrderPlaced`
- `OrderConfirmed`
- `OrderCancelled`
- `OrderFailed`

**Integration Events Published:**
- `OrderPlaced` → Inventory, Payments, Shipping
- `OrderConfirmed` → Shipping
- `OrderCancelled` → Inventory, Payments

**Integration Events Subscribed:**
- `InventoryReserved` (from Inventory)
- `PaymentProcessed` (from Payments)
- `PaymentFailed` (from Payments)
- `ShipmentCreated` (from Shipping)

### 4. Payments Context
**Responsibility:** Payment processing

**Features:**
- Process payment
- Refund payment
- Payment verification
- Payment method management

**Domain Events:**
- `PaymentInitiated`
- `PaymentProcessed`
- `PaymentFailed`
- `PaymentRefunded`

**Integration Events Published:**
- `PaymentProcessed` → Orders
- `PaymentFailed` → Orders
- `PaymentRefunded` → Orders

**Integration Events Subscribed:**
- `OrderPlaced` (from Orders)
- `OrderCancelled` (from Orders)

### 5. Shipping Context
**Responsibility:** Shipment creation and tracking

**Features:**
- Create shipment
- Update tracking status
- Calculate shipping cost
- Delivery confirmation

**Domain Events:**
- `ShipmentCreated`
- `ShipmentShipped`
- `ShipmentInTransit`
- `ShipmentDelivered`

**Integration Events Published:**
- `ShipmentCreated` → Orders
- `ShipmentDelivered` → Orders

**Integration Events Subscribed:**
- `OrderConfirmed` (from Orders)
- `PaymentProcessed` (from Payments)

## Saga Pattern: Place Order

### Happy Path Flow

```
1. User submits order
   └─> Orders: PlaceOrderCommand

2. Orders: Reserve inventory
   └─> Inventory: ReserveInventoryCommand
   └─> Integration Event: InventoryReserved

3. Orders: Process payment
   └─> Payments: ProcessPaymentCommand
   └─> Integration Event: PaymentProcessed

4. Orders: Confirm order
   └─> Orders: ConfirmOrderCommand
   └─> Integration Event: OrderConfirmed

5. Shipping: Create shipment
   └─> Shipping: CreateShipmentCommand
   └─> Integration Event: ShipmentCreated

6. ✅ Order complete!
```

### Failure Scenarios & Compensation

**Scenario 1: Inventory unavailable**
```
1. PlaceOrder → Reserve Inventory
2. ❌ OutOfStock event
3. Compensation: Cancel order
4. Result: Order cancelled
```

**Scenario 2: Payment fails**
```
1. PlaceOrder → Reserve Inventory ✅
2. Reserve → Process Payment
3. ❌ PaymentFailed event
4. Compensation: Release inventory
5. Compensation: Cancel order
6. Result: Order cancelled, inventory released
```

**Scenario 3: Shipping unavailable**
```
1. PlaceOrder → Reserve Inventory ✅
2. Reserve → Process Payment ✅
3. Confirm → Create Shipment
4. ❌ ShippingUnavailable event
5. Compensation: Refund payment
6. Compensation: Release inventory
7. Compensation: Cancel order
8. Result: Order cancelled, payment refunded, inventory released
```

## Saga Implementation

### Saga Coordinator (in Orders Context)

```typescript
// orders/place-order/PlaceOrderSaga.ts
export class PlaceOrderSaga {
  private state: SagaState = 'STARTED';
  private compensations: Array<() => Promise<void>> = [];

  async execute(order: Order): Promise<void> {
    try {
      // Step 1: Reserve inventory
      await this.reserveInventory(order);
      this.compensations.push(() => this.releaseInventory(order));

      // Step 2: Process payment
      await this.processPayment(order);
      this.compensations.push(() => this.refundPayment(order));

      // Step 3: Confirm order
      await this.confirmOrder(order);

      // Step 4: Create shipment
      await this.createShipment(order);

      this.state = 'COMPLETED';
    } catch (error) {
      await this.compensate();
      this.state = 'FAILED';
      throw error;
    }
  }

  private async compensate(): Promise<void> {
    // Execute compensations in reverse order
    for (const compensation of this.compensations.reverse()) {
      await compensation();
    }
  }
}
```

## Integration Events Flow Diagram

```
Catalog ──(ProductCreated)──────────────────────────▶ Inventory
                                                            │
Orders ──(OrderPlaced)──────┬───────────────────────────▶ │
                             │                              │
                             ├─────────────────────────▶ Payments
                             │                              │
                             └─────────────────────────▶ Shipping

Inventory ──(InventoryReserved)──▶ Orders
Inventory ──(OutOfStock)──────────▶ Orders

Payments ──(PaymentProcessed)─────▶ Orders
Payments ──(PaymentFailed)────────▶ Orders

Orders ──(OrderConfirmed)─────────▶ Shipping

Shipping ──(ShipmentCreated)──────▶ Orders
Shipping ──(ShipmentDelivered)────▶ Orders
```

## Tech Stack

### Backend
- TypeScript with Node.js
- Nest.js framework
- PostgreSQL (event store + read models)
- Redis (caching)
- Docker Compose

### Frontend
- Next.js 14 (App Router)
- React Server Components
- TailwindCSS
- SWR for data fetching

### APIs
- GraphQL (Apollo Server)
- REST (for external integrations)

## File Structure

```
03-ecommerce-platform-ts/
├── backend/
│   ├── src/
│   │   ├── contexts/
│   │   │   ├── catalog/
│   │   │   │   ├── create-product/
│   │   │   │   ├── update-product/
│   │   │   │   └── search-products/
│   │   │   ├── inventory/
│   │   │   │   ├── reserve-inventory/
│   │   │   │   ├── release-inventory/
│   │   │   │   └── adjust-stock/
│   │   │   ├── orders/
│   │   │   │   ├── place-order/
│   │   │   │   │   ├── PlaceOrderCommand.ts
│   │   │   │   │   ├── PlaceOrderSaga.ts      # 🌟 Saga orchestrator
│   │   │   │   │   ├── PlaceOrderHandler.ts
│   │   │   │   │   └── PlaceOrder.test.ts
│   │   │   │   ├── cancel-order/
│   │   │   │   └── _subscribers/
│   │   │   ├── payments/
│   │   │   │   ├── process-payment/
│   │   │   │   ├── refund-payment/
│   │   │   │   └── _subscribers/
│   │   │   └── shipping/
│   │   │       ├── create-shipment/
│   │   │       └── _subscribers/
│   │   ├── _shared/
│   │   │   ├── integration-events/
│   │   │   ├── sagas/
│   │   │   │   ├── SagaOrchestrator.ts
│   │   │   │   └── SagaState.ts
│   │   │   └── types/
│   │   ├── api/
│   │   │   ├── graphql/
│   │   │   │   ├── schema.graphql
│   │   │   │   └── resolvers/
│   │   │   └── rest/
│   │   │       └── routes/
│   │   └── infrastructure/
│   └── tests/
│       └── e2e/
│           └── placeOrderSaga.test.ts
└── frontend/
    ├── app/
    │   ├── products/
    │   ├── cart/
    │   └── checkout/
    └── components/
```

## Key Patterns

### 1. Saga Orchestration
Coordinates multi-step workflows across contexts with compensation logic

### 2. Compensating Transactions
Reverses completed steps when a saga fails

### 3. Event Sourcing + CQRS
Separate write (commands/events) from read (projections/queries)

### 4. API Gateway Pattern
GraphQL acts as unified API over multiple contexts

### 5. Cache-Aside Pattern
Redis caches frequently accessed data

## Testing Strategy

### Unit Tests
- Test each vertical slice
- Mock event bus
- Test saga steps individually

### Integration Tests
- Test context communication via events
- Use test event bus
- Verify compensations

### E2E Tests
- Test complete user flows
- Place order happy path
- Place order with failures
- Verify UI updates

## Deployment

### Docker Compose (Development)
```yaml
services:
  postgres:
  redis:
  backend:
  frontend:
```

### Kubernetes (Production)
- Each context as a microservice
- Shared event bus (Kafka/RabbitMQ)
- API Gateway
- Load balancers

## Observability

### Tracing
- OpenTelemetry
- Trace saga execution
- Track event flow

### Metrics
- Prometheus + Grafana
- Saga success/failure rates
- Event processing latency

### Logging
- Structured logging
- Saga state transitions
- Error tracking with Sentry

## Security

- JWT authentication
- RBAC authorization
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## Performance Optimizations

- Database indexes
- Redis caching
- Connection pooling
- Query optimization
- CDN for static assets
- Image optimization

## Next Steps to Implement

1. Setup project structure
2. Implement Catalog context
3. Implement Inventory context
4. Implement Orders context with saga
5. Implement Payments context
6. Implement Shipping context
7. Setup event bus
8. Implement all subscribers
9. Create GraphQL API
10. Build Next.js frontend
11. Add comprehensive tests
12. Setup Docker Compose
13. Add monitoring
14. Write deployment guide

## References

- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS](https://martinfowler.com/bliki/CQRS.html)

---

**Estimated Implementation Time:** 3-4 weeks  
**Complexity:** ⭐⭐⭐ Advanced  
**LOC:** ~5,000+

This architecture serves as a blueprint for building production-ready event-driven systems with VSA.

