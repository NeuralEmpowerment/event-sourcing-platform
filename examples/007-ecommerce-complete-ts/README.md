# 007-ecommerce-complete-ts — Complete E-commerce Platform

**✅ ADR-004 COMPLIANT:** Demonstrates proper aggregate-based command handling with decorators.

A comprehensive e-commerce platform example showcasing three fully-featured aggregates following ADR-004 architectural patterns.

## Features

### 🛒 Three Complete Aggregates

1. **ProductAggregate** - Product catalog management
   - `@CommandHandler` `createProduct()` - Create new products
   - `@CommandHandler` `updatePrice()` - Update product pricing
   - `@CommandHandler` `addStock()` - Add inventory
   - `@CommandHandler` `removeStock()` - Remove inventory (e.g., for orders)

2. **OrderAggregate** - Order lifecycle management
   - `@CommandHandler` `createOrder()` - Create draft order
   - `@CommandHandler` `addItem()` - Add items to order
   - `@CommandHandler` `confirmOrder()` - Confirm and calculate total
   - `@CommandHandler` `shipOrder()` - Ship with tracking number
   - `@CommandHandler` `cancelOrder()` - Cancel order

3. **CustomerAggregate** - Customer management
   - `@CommandHandler` `registerCustomer()` - Register new customer
   - `@CommandHandler` `updateAddress()` - Update shipping address

### 🎯 Demonstrates

- ✅ Commands as classes (not interfaces) with `aggregateId`
- ✅ `@Aggregate` decorators on all aggregate classes
- ✅ `@CommandHandler` decorators for command processing
- ✅ `apply()` method for event emission (not `raiseEvent()`)
- ✅ `@EventSourcingHandler` for state updates
- ✅ Business validation in command handlers
- ✅ State-only updates in event sourcing handlers
- ✅ Complete order flow: Customer → Product → Order → Shipping
- ✅ Stock management and inventory tracking
- ✅ Order status state machine (DRAFT → CONFIRMED → SHIPPED)

## Run

```bash
# Memory mode (fast, no dependencies)
pnpm --filter ./examples/007-ecommerce-complete-ts run start -- --memory

# gRPC mode (requires event store)
./dev-tools/dev start
pnpm --filter ./examples/007-ecommerce-complete-ts run start
```

## Example Output

```
🛒 E-commerce Platform - Complete Example
==========================================
✅ ADR-004 COMPLIANT: Command handlers integrated in aggregates

👤 DEMO: Customer Registration
✓ Customer registered: customer-001
  Email: john.doe@example.com
  Name: John Doe

📦 DEMO: Product Management
✓ Product created: product-001
  Name: Wireless Mouse
  Price: $29.99
  Stock: 100 units
✓ Stock added: +50 units (now 150 units)

📋 DEMO: Order Lifecycle
✓ Order created: order-001
✓ Item added: 2x Wireless Mouse @ $29.99
✓ Order confirmed (Status: CONFIRMED)
  Total: $59.98
✓ Stock removed: -2 units (now 148 units)
✓ Order shipped (Status: SHIPPED)

🎉 Complete E-commerce Flow Demonstrated!
✅ ADR-004 COMPLIANCE VERIFIED
```

## Architecture

All aggregates follow the ADR-004 pattern:

```typescript
@Aggregate("Product")
class ProductAggregate extends AggregateRoot<ProductEvent> {
  private name = "";
  private price = 0;
  private stock = 0;

  // Command Handler - validates and applies events
  @CommandHandler("CreateProductCommand")
  createProduct(command: CreateProductCommand): void {
    // 1. Validation
    if (!command.name) throw new Error("Product name is required");
    if (this.id !== null) throw new Error("Product already exists");
    
    // 2. Initialize
    this.initialize(command.aggregateId);
    
    // 3. Apply event
    this.apply(new ProductCreatedEvent(...));
  }

  // Event Sourcing Handler - updates state only
  @EventSourcingHandler("ProductCreated")
  private onProductCreated(event: ProductCreatedEvent): void {
    this.name = event.name;
    this.price = event.price;
    this.stock = event.stock;
  }
}
```

## Learn More

- **ADR-004**: [docs/adrs/ADR-004-command-handlers-in-aggregates.md](../../docs/adrs/ADR-004-command-handlers-in-aggregates.md)
- **Event Sourcing Patterns**: See other examples in `/examples`
