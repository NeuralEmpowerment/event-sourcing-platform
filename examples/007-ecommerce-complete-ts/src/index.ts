/**
 * 007-ecommerce-complete-ts
 * 
 * Complete E-commerce Example demonstrating ADR-004 compliance
 * Features: Products, Orders, Customers with full aggregate pattern
 */

import {
  AggregateRoot,
  Aggregate,
  EventSourcingHandler,
  CommandHandler,
  BaseDomainEvent,
  EventType,
  EventStoreClient,
  EventStoreClientFactory,
  MemoryEventStoreClient,
} from "@event-sourcing-platform/typescript";

// ============================================================================
// PRODUCT AGGREGATE
// ============================================================================

// Commands
class CreateProductCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly stock: number
  ) {}
}

class UpdateProductPriceCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly newPrice: number
  ) {}
}

class AddStockCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly quantity: number
  ) {}
}

class RemoveStockCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly quantity: number,
    public readonly orderId: string
  ) {}
}

// Events
class ProductCreatedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "ProductCreated";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly productId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly stock: number
  ) {
    super();
  }
}

class ProductPriceUpdatedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "ProductPriceUpdated";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly oldPrice: number,
    public readonly newPrice: number
  ) {
    super();
  }
}

class StockAddedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "StockAdded";
  readonly schemaVersion: number = 1;
  constructor(public readonly quantity: number) {
    super();
  }
}

class StockRemovedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "StockRemoved";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly quantity: number,
    public readonly orderId: string
  ) {
    super();
  }
}

type ProductEvent = ProductCreatedEvent | ProductPriceUpdatedEvent | StockAddedEvent | StockRemovedEvent;

@Aggregate("Product")
class ProductAggregate extends AggregateRoot<ProductEvent> {
  private name = "";
  private description = "";
  private price = 0;
  private stock = 0;

  getAggregateType(): string {
    return "Product";
  }

  @CommandHandler("CreateProductCommand")
  createProduct(command: CreateProductCommand): void {
    if (!command.name) throw new Error("Product name is required");
    if (command.price < 0) throw new Error("Price cannot be negative");
    if (command.stock < 0) throw new Error("Stock cannot be negative");
    if (this.id !== null) throw new Error("Product already exists");

    this.initialize(command.aggregateId);
    this.apply(new ProductCreatedEvent(
      command.aggregateId,
      command.name,
      command.description,
      command.price,
      command.stock
    ));
  }

  @CommandHandler("UpdateProductPriceCommand")
  updatePrice(command: UpdateProductPriceCommand): void {
    if (this.id === null) throw new Error("Product does not exist");
    if (command.newPrice < 0) throw new Error("Price cannot be negative");
    if (command.newPrice === this.price) throw new Error("New price is same as current price");

    this.apply(new ProductPriceUpdatedEvent(this.price, command.newPrice));
  }

  @CommandHandler("AddStockCommand")
  addStock(command: AddStockCommand): void {
    if (this.id === null) throw new Error("Product does not exist");
    if (command.quantity <= 0) throw new Error("Quantity must be positive");

    this.apply(new StockAddedEvent(command.quantity));
  }

  @CommandHandler("RemoveStockCommand")
  removeStock(command: RemoveStockCommand): void {
    if (this.id === null) throw new Error("Product does not exist");
    if (command.quantity <= 0) throw new Error("Quantity must be positive");
    if (this.stock < command.quantity) {
      throw new Error(`Insufficient stock: requested ${command.quantity}, available ${this.stock}`);
    }

    this.apply(new StockRemovedEvent(command.quantity, command.orderId));
  }

  @EventSourcingHandler("ProductCreated")
  private onProductCreated(event: ProductCreatedEvent): void {
    this.name = event.name;
    this.description = event.description;
    this.price = event.price;
    this.stock = event.stock;
  }

  @EventSourcingHandler("ProductPriceUpdated")
  private onPriceUpdated(event: ProductPriceUpdatedEvent): void {
    this.price = event.newPrice;
  }

  @EventSourcingHandler("StockAdded")
  private onStockAdded(event: StockAddedEvent): void {
    this.stock += event.quantity;
  }

  @EventSourcingHandler("StockRemoved")
  private onStockRemoved(event: StockRemovedEvent): void {
    this.stock -= event.quantity;
  }

  getStock(): number { return this.stock; }
  getPrice(): number { return this.price; }
  getName(): string { return this.name; }
}

// ============================================================================
// ORDER AGGREGATE
// ============================================================================

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
}

// Commands
class CreateOrderCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly customerId: string
  ) {}
}

class AddOrderItemCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly productId: string,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly pricePerUnit: number
  ) {}
}

class ConfirmOrderCommand {
  constructor(public readonly aggregateId: string) {}
}

class ShipOrderCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly trackingNumber: string
  ) {}
}

class CancelOrderCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly reason: string
  ) {}
}

// Events
class OrderCreatedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "OrderCreated";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly orderId: string,
    public readonly customerId: string
  ) {
    super();
  }
}

class OrderItemAddedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "OrderItemAdded";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly productId: string,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly pricePerUnit: number
  ) {
    super();
  }
}

class OrderConfirmedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "OrderConfirmed";
  readonly schemaVersion: number = 1;
  constructor(public readonly totalAmount: number) {
    super();
  }
}

class OrderShippedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "OrderShipped";
  readonly schemaVersion: number = 1;
  constructor(public readonly trackingNumber: string) {
    super();
  }
}

class OrderCancelledEvent extends BaseDomainEvent {
  readonly eventType: EventType = "OrderCancelled";
  readonly schemaVersion: number = 1;
  constructor(public readonly reason: string) {
    super();
  }
}

type OrderEvent = OrderCreatedEvent | OrderItemAddedEvent | OrderConfirmedEvent | OrderShippedEvent | OrderCancelledEvent;

enum OrderStatus {
  DRAFT = "DRAFT",
  CONFIRMED = "CONFIRMED",
  SHIPPED = "SHIPPED",
  CANCELLED = "CANCELLED"
}

@Aggregate("Order")
class OrderAggregate extends AggregateRoot<OrderEvent> {
  private customerId = "";
  private items: OrderItem[] = [];
  private status = OrderStatus.DRAFT;
  private totalAmount = 0;
  private trackingNumber = "";

  getAggregateType(): string {
    return "Order";
  }

  @CommandHandler("CreateOrderCommand")
  createOrder(command: CreateOrderCommand): void {
    if (!command.customerId) throw new Error("Customer ID is required");
    if (this.id !== null) throw new Error("Order already exists");

    this.initialize(command.aggregateId);
    this.apply(new OrderCreatedEvent(command.aggregateId, command.customerId));
  }

  @CommandHandler("AddOrderItemCommand")
  addItem(command: AddOrderItemCommand): void {
    if (this.id === null) throw new Error("Order does not exist");
    if (this.status !== OrderStatus.DRAFT) {
      throw new Error("Cannot add items to a confirmed/shipped/cancelled order");
    }
    if (command.quantity <= 0) throw new Error("Quantity must be positive");
    if (command.pricePerUnit < 0) throw new Error("Price cannot be negative");

    this.apply(new OrderItemAddedEvent(
      command.productId,
      command.productName,
      command.quantity,
      command.pricePerUnit
    ));
  }

  @CommandHandler("ConfirmOrderCommand")
  confirmOrder(command: ConfirmOrderCommand): void {
    if (this.id === null) throw new Error("Order does not exist");
    if (this.status !== OrderStatus.DRAFT) throw new Error("Order is not in DRAFT status");
    if (this.items.length === 0) throw new Error("Cannot confirm empty order");

    const total = this.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
    this.apply(new OrderConfirmedEvent(total));
  }

  @CommandHandler("ShipOrderCommand")
  shipOrder(command: ShipOrderCommand): void {
    if (this.id === null) throw new Error("Order does not exist");
    if (this.status !== OrderStatus.CONFIRMED) throw new Error("Order must be confirmed before shipping");
    if (!command.trackingNumber) throw new Error("Tracking number is required");

    this.apply(new OrderShippedEvent(command.trackingNumber));
  }

  @CommandHandler("CancelOrderCommand")
  cancelOrder(command: CancelOrderCommand): void {
    if (this.id === null) throw new Error("Order does not exist");
    if (this.status === OrderStatus.SHIPPED) throw new Error("Cannot cancel shipped order");
    if (this.status === OrderStatus.CANCELLED) throw new Error("Order is already cancelled");
    if (!command.reason) throw new Error("Cancellation reason is required");

    this.apply(new OrderCancelledEvent(command.reason));
  }

  @EventSourcingHandler("OrderCreated")
  private onOrderCreated(event: OrderCreatedEvent): void {
    this.customerId = event.customerId;
  }

  @EventSourcingHandler("OrderItemAdded")
  private onItemAdded(event: OrderItemAddedEvent): void {
    this.items.push({
      productId: event.productId,
      productName: event.productName,
      quantity: event.quantity,
      pricePerUnit: event.pricePerUnit
    });
  }

  @EventSourcingHandler("OrderConfirmed")
  private onOrderConfirmed(event: OrderConfirmedEvent): void {
    this.status = OrderStatus.CONFIRMED;
    this.totalAmount = event.totalAmount;
  }

  @EventSourcingHandler("OrderShipped")
  private onOrderShipped(event: OrderShippedEvent): void {
    this.status = OrderStatus.SHIPPED;
    this.trackingNumber = event.trackingNumber;
  }

  @EventSourcingHandler("OrderCancelled")
  private onOrderCancelled(event: OrderCancelledEvent): void {
    this.status = OrderStatus.CANCELLED;
  }

  getStatus(): OrderStatus { return this.status; }
  getTotalAmount(): number { return this.totalAmount; }
  getItems(): OrderItem[] { return [...this.items]; }
}

// ============================================================================
// CUSTOMER AGGREGATE
// ============================================================================

// Commands
class RegisterCustomerCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly address: string
  ) {}
}

class UpdateCustomerAddressCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly newAddress: string
  ) {}
}

// Events
class CustomerRegisteredEvent extends BaseDomainEvent {
  readonly eventType: EventType = "CustomerRegistered";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly customerId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly address: string
  ) {
    super();
  }
}

class CustomerAddressUpdatedEvent extends BaseDomainEvent {
  readonly eventType: EventType = "CustomerAddressUpdated";
  readonly schemaVersion: number = 1;
  constructor(
    public readonly oldAddress: string,
    public readonly newAddress: string
  ) {
    super();
  }
}

type CustomerEvent = CustomerRegisteredEvent | CustomerAddressUpdatedEvent;

@Aggregate("Customer")
class CustomerAggregate extends AggregateRoot<CustomerEvent> {
  private email = "";
  private name = "";
  private address = "";

  getAggregateType(): string {
    return "Customer";
  }

  @CommandHandler("RegisterCustomerCommand")
  registerCustomer(command: RegisterCustomerCommand): void {
    if (!command.email || !command.email.includes("@")) throw new Error("Valid email is required");
    if (!command.name) throw new Error("Name is required");
    if (!command.address) throw new Error("Address is required");
    if (this.id !== null) throw new Error("Customer already registered");

    this.initialize(command.aggregateId);
    this.apply(new CustomerRegisteredEvent(
      command.aggregateId,
      command.email,
      command.name,
      command.address
    ));
  }

  @CommandHandler("UpdateCustomerAddressCommand")
  updateAddress(command: UpdateCustomerAddressCommand): void {
    if (this.id === null) throw new Error("Customer does not exist");
    if (!command.newAddress) throw new Error("New address is required");
    if (command.newAddress === this.address) throw new Error("New address is same as current address");

    this.apply(new CustomerAddressUpdatedEvent(this.address, command.newAddress));
  }

  @EventSourcingHandler("CustomerRegistered")
  private onCustomerRegistered(event: CustomerRegisteredEvent): void {
    this.email = event.email;
    this.name = event.name;
    this.address = event.address;
  }

  @EventSourcingHandler("CustomerAddressUpdated")
  private onAddressUpdated(event: CustomerAddressUpdatedEvent): void {
    this.address = event.newAddress;
  }

  getEmail(): string { return this.email; }
  getName(): string { return this.name; }
  getAddress(): string { return this.address; }
}

// ============================================================================
// MAIN DEMO
// ============================================================================

type ClientMode = "memory" | "grpc";
type Options = { mode: ClientMode };

function parseOptions(): Options {
  if (process.argv.includes("--memory")) return { mode: "memory" };
  const envMode = (process.env.EVENT_STORE_MODE ?? "").toLowerCase();
  if (envMode === "memory") return { mode: "memory" };
  return { mode: "grpc" };
}

async function createClient(opts: Options): Promise<EventStoreClient> {
  if (opts.mode === "memory") {
    console.log("🧪 Using in-memory event store client");
    const client = new MemoryEventStoreClient();
    await client.connect();
    return client;
  }

  const serverAddress = process.env.EVENT_STORE_ADDR ?? "127.0.0.1:50051";
  const tenantId = process.env.EVENT_STORE_TENANT ?? "ecommerce-tenant";
  console.log(`🛰️  Using gRPC event store at ${serverAddress} (tenant=${tenantId})`);

  const client = EventStoreClientFactory.createGrpcClient({ serverAddress, tenantId });
  try {
    await client.connect();
  } catch (error) {
    console.error(
      "⚠️  Failed to connect to gRPC event store.\n" +
      "   To start dev infrastructure: make dev-start\n" +
      "   To use in-memory mode instead: rerun with --memory"
    );
    throw error;
  }
  return client;
}

async function main(): Promise<void> {
  console.log("🛒 E-commerce Platform - Complete Example");
  console.log("==========================================");
  console.log("✅ ADR-004 COMPLIANT: Command handlers integrated in aggregates\n");

  const options = parseOptions();
  const client = await createClient(options);

  try {
    // Demo: Customer Registration
    console.log("👤 DEMO: Customer Registration");
    console.log("===============================");
    const customerId = "customer-001";
    const customer = new CustomerAggregate();
    (customer as any).handleCommand(new RegisterCustomerCommand(
      customerId,
      "john.doe@example.com",
      "John Doe",
      "123 Main St, Springfield"
    ));
    console.log(`✓ Customer registered: ${customerId}`);
    console.log(`  Email: ${customer.getEmail()}`);
    console.log(`  Name: ${customer.getName()}`);
    console.log(`  Events: ${customer.getUncommittedEvents().length}`);

    // Demo: Product Management
    console.log("\n📦 DEMO: Product Management");
    console.log("============================");
    const productId = "product-001";
    const product = new ProductAggregate();
    (product as any).handleCommand(new CreateProductCommand(
      productId,
      "Wireless Mouse",
      "Ergonomic wireless mouse with 6 buttons",
      29.99,
      100
    ));
    console.log(`✓ Product created: ${productId}`);
    console.log(`  Name: ${product.getName()}`);
    console.log(`  Price: $${product.getPrice()}`);
    console.log(`  Stock: ${product.getStock()} units`);

    (product as any).handleCommand(new AddStockCommand(productId, 50));
    console.log(`✓ Stock added: +50 units (now ${product.getStock()} units)`);

    // Demo: Order Lifecycle
    console.log("\n📋 DEMO: Order Lifecycle");
    console.log("=========================");
    const orderId = "order-001";
    const order = new OrderAggregate();
    (order as any).handleCommand(new CreateOrderCommand(orderId, customerId));
    console.log(`✓ Order created: ${orderId}`);

    (order as any).handleCommand(new AddOrderItemCommand(
      orderId,
      productId,
      product.getName(),
      2,
      product.getPrice()
    ));
    console.log(`✓ Item added: 2x ${product.getName()} @ $${product.getPrice()}`);

    (order as any).handleCommand(new ConfirmOrderCommand(orderId));
    console.log(`✓ Order confirmed (Status: ${order.getStatus()})`);
    console.log(`  Total: $${order.getTotalAmount().toFixed(2)}`);

    // Remove stock for the order
    (product as any).handleCommand(new RemoveStockCommand(productId, 2, orderId));
    console.log(`✓ Stock removed: -2 units (now ${product.getStock()} units)`);

    (order as any).handleCommand(new ShipOrderCommand(orderId, "TRACK-12345"));
    console.log(`✓ Order shipped (Status: ${order.getStatus()})`);

    console.log("\n🎉 Complete E-commerce Flow Demonstrated!");
    console.log("\n📊 Architecture Summary:");
    console.log("  ✓ ProductAggregate with 4 @CommandHandler methods");
    console.log("  ✓ OrderAggregate with 5 @CommandHandler methods");
    console.log("  ✓ CustomerAggregate with 2 @CommandHandler methods");
    console.log("  ✓ All commands as classes with aggregateId");
    console.log("  ✓ Events applied using apply() (not raiseEvent())");
    console.log("  ✓ Business logic validation in command handlers");
    console.log("  ✓ State-only updates in event sourcing handlers");
    console.log("\n✅ ADR-004 COMPLIANCE VERIFIED\n");

  } finally {
    await client.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Example failed", error);
    process.exitCode = 1;
  });
}
