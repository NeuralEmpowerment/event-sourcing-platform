import { randomUUID } from "crypto";

import {
  Aggregate,
  AggregateRoot,
  BaseDomainEvent,
  CommandHandler,
  EventSourcingHandler,
  EventSerializer,
  EventStoreClient,
  EventStoreClientFactory,
  MemoryEventStoreClient,
  RepositoryFactory,
} from "@event-sourcing-platform/typescript";

type ClientMode = "memory" | "grpc";

type Options = {
  mode: ClientMode;
};

function parseOptions(): Options {
  if (process.argv.includes("--memory")) {
    return { mode: "memory" };
  }
  const envMode = (process.env.EVENT_STORE_MODE ?? "").toLowerCase();
  if (envMode === "memory") {
    return { mode: "memory" };
  }
  return { mode: "grpc" };
}

async function createClient(opts: Options): Promise<EventStoreClient> {
  if (opts.mode === "memory") {
    console.log(
      "🧪 Using in-memory event store client (override via --memory).",
    );
    const client = new MemoryEventStoreClient();
    await client.connect();
    return client;
  }

  const serverAddress = process.env.EVENT_STORE_ADDR ?? "127.0.0.1:50051";
  const tenantId = process.env.EVENT_STORE_TENANT ?? "example-tenant";
  console.log(
    `🛰️  Using gRPC event store at ${serverAddress} (tenant=${tenantId})`,
  );

  const client = EventStoreClientFactory.createGrpcClient({
    serverAddress,
    tenantId,
  });
  try {
    await client.connect();
  } catch (error) {
    console.error(
      "⚠️  Failed to connect to the gRPC event store.\n" +
      "   To start dev infrastructure: make dev-start\n" +
      "   To use in-memory mode instead: rerun with --memory"
    );
    throw error;
  }
  return client;
}

// ========================================
// COMMANDS (What we want to happen)
// ========================================

/**
 * Command to create a new product in the inventory system.
 * Validates that product details are provided.
 */
class CreateProductCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly name: string,
    public readonly sku: string,
    public readonly reorderLevel: number
  ) { }
}

/**
 * Command to receive stock from a supplier.
 * Increases inventory levels.
 */
class ReceiveStockCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly quantity: number,
    public readonly supplierId: string
  ) { }
}

/**
 * Command to sell stock to a customer.
 * Validates sufficient stock is available.
 */
class SellStockCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly quantity: number,
    public readonly orderId: string
  ) { }
}

/**
 * Command to trigger a reorder from supplier.
 * Used when stock falls below reorder level.
 */
class TriggerReorderCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly quantity: number,
    public readonly supplierId: string
  ) { }
}

// ========================================
// EVENTS (What happened)
// ========================================
class ProductCreated extends BaseDomainEvent {
  readonly eventType = "ProductCreated" as const;
  readonly schemaVersion = 1 as const;
  constructor(public productId: string, public name: string, public sku: string, public reorderLevel: number) { super(); }
}

class StockReceived extends BaseDomainEvent {
  readonly eventType = "StockReceived" as const;
  readonly schemaVersion = 1 as const;
  constructor(public quantity: number, public supplierId: string) { super(); }
}

class StockSold extends BaseDomainEvent {
  readonly eventType = "StockSold" as const;
  readonly schemaVersion = 1 as const;
  constructor(public quantity: number, public orderId: string) { super(); }
}

class ReorderTriggered extends BaseDomainEvent {
  readonly eventType = "ReorderTriggered" as const;
  readonly schemaVersion = 1 as const;
  constructor(public quantity: number, public supplierId: string) { super(); }
}

// ========================================
// AGGREGATE (Domain Logic & Invariants)
// ========================================

/**
 * ProductAggregate - Manages inventory for a single product
 * 
 * Following ADR-004 pattern:
 * - @Aggregate decorator marks this as an aggregate root
 * - @CommandHandler methods validate and decide what events to emit
 * - @EventSourcingHandler methods update state only (no validation)
 * - Uses apply() to emit events (not raiseEvent())
 * 
 * Business Rules:
 * - Product must have a name, SKU, and reorder level
 * - Cannot sell more stock than available
 * - Reorder triggered when stock <= reorder level
 */
@Aggregate('Product')
class ProductAggregate extends AggregateRoot<ProductCreated | StockReceived | StockSold | ReorderTriggered> {
  private name = "";
  private sku = "";
  private currentStock = 0;
  private reorderLevel = 0;

  getAggregateType(): string {
    return "Product";
  }

  /**
   * Command Handler: Create a new product
   * Validates product details and initializes the aggregate.
   */
  @CommandHandler('CreateProductCommand')
  createProduct(command: CreateProductCommand): void {
    // VALIDATION - Business rules
    if (!command.name) {
      throw new Error("Product name is required");
    }
    if (!command.sku) {
      throw new Error("Product SKU is required");
    }
    if (command.reorderLevel < 0) {
      throw new Error("Reorder level must be non-negative");
    }
    if (this.id !== null) {
      throw new Error("Product already exists");
    }

    // INITIALIZE - Set aggregate ID
    this.initialize(command.aggregateId);

    // APPLY - Emit event (NOT raiseEvent!)
    this.apply(new ProductCreated(
      command.aggregateId,
      command.name,
      command.sku,
      command.reorderLevel
    ));
  }

  /**
   * Command Handler: Receive stock from supplier
   * Increases inventory levels.
   */
  @CommandHandler('ReceiveStockCommand')
  receiveStock(command: ReceiveStockCommand): void {
    // VALIDATION
    if (command.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }
    if (!command.supplierId) {
      throw new Error("Supplier ID is required");
    }

    // APPLY
    this.apply(new StockReceived(command.quantity, command.supplierId));
  }

  /**
   * Command Handler: Sell stock to customer
   * Validates sufficient stock is available.
   */
  @CommandHandler('SellStockCommand')
  sellStock(command: SellStockCommand): void {
    // VALIDATION
    if (command.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }
    if (this.currentStock < command.quantity) {
      throw new Error(`Insufficient stock: requested ${command.quantity}, available ${this.currentStock}`);
    }
    if (!command.orderId) {
      throw new Error("Order ID is required");
    }

    // APPLY
    this.apply(new StockSold(command.quantity, command.orderId));
  }

  /**
   * Command Handler: Trigger reorder from supplier
   * Used when stock falls below reorder level.
   */
  @CommandHandler('TriggerReorderCommand')
  triggerReorder(command: TriggerReorderCommand): void {
    // VALIDATION
    if (command.quantity <= 0) {
      throw new Error("Reorder quantity must be positive");
    }
    if (!command.supplierId) {
      throw new Error("Supplier ID is required");
    }

    // APPLY
    this.apply(new ReorderTriggered(command.quantity, command.supplierId));
  }

  // ========================================
  // EVENT SOURCING HANDLERS (State Updates Only)
  // ========================================

  /**
   * Event Handler: Product was created
   * Updates aggregate state with product details.
   * NO validation - event already happened and was validated.
   */
  @EventSourcingHandler("ProductCreated")
  private onCreated(event: ProductCreated): void {
    this.name = event.name;
    this.sku = event.sku;
    this.reorderLevel = event.reorderLevel;
  }

  /**
   * Event Handler: Stock was received
   * Increases current stock level.
   */
  @EventSourcingHandler("StockReceived")
  private onStockReceived(event: StockReceived): void {
    this.currentStock += event.quantity;
  }

  /**
   * Event Handler: Stock was sold
   * Decreases current stock level.
   */
  @EventSourcingHandler("StockSold")
  private onStockSold(event: StockSold): void {
    this.currentStock -= event.quantity;
  }

  /**
   * Event Handler: Reorder was triggered
   * Tracking only - no state changes needed.
   */
  @EventSourcingHandler("ReorderTriggered")
  private onReorderTriggered(): void {
    // Tracking only - could track last reorder date if needed
  }

  // ========================================
  // QUERY METHODS (Read-only state access)
  // ========================================

  getCurrentStock(): number {
    return this.currentStock;
  }

  getReorderLevel(): number {
    return this.reorderLevel;
  }

  needsReorder(): boolean {
    return this.currentStock <= this.reorderLevel;
  }

  getName(): string {
    return this.name;
  }

  getSku(): string {
    return this.sku;
  }
}

// Projections
interface InventoryView {
  productId: string; name: string; sku: string; currentStock: number; reorderLevel: number;
  needsReorder: boolean; totalSold: number; totalReceived: number;
}

class InventoryProjection {
  private inventory = new Map<string, InventoryView>();

  processEvent(envelope: any) {
    const event = envelope.event;
    const productId = envelope.metadata.aggregateId;

    switch (event.eventType) {
      case "ProductCreated":
        this.inventory.set(productId, {
          productId, name: event.name, sku: event.sku, currentStock: 0, reorderLevel: event.reorderLevel,
          needsReorder: false, totalSold: 0, totalReceived: 0
        });
        break;
      case "StockReceived":
        const product = this.inventory.get(productId);
        if (product) {
          product.currentStock += event.quantity;
          product.totalReceived += event.quantity;
          product.needsReorder = product.currentStock <= product.reorderLevel;
        }
        break;
      case "StockSold":
        const soldProduct = this.inventory.get(productId);
        if (soldProduct) {
          soldProduct.currentStock -= event.quantity;
          soldProduct.totalSold += event.quantity;
          soldProduct.needsReorder = soldProduct.currentStock <= soldProduct.reorderLevel;
        }
        break;
    }
  }

  getAllProducts() { return Array.from(this.inventory.values()); }
  getProduct(id: string) { return this.inventory.get(id); }
  getLowStockProducts() { return Array.from(this.inventory.values()).filter(p => p.needsReorder); }
}

/**
 * Main function demonstrating the ADR-004 pattern:
 * 
 * 1. Commands are classes with aggregateId
 * 2. Aggregate has @Aggregate decorator
 * 3. Command handlers use @CommandHandler decorator
 * 4. Commands dispatched via handleCommand()
 * 5. Events emitted via apply() not raiseEvent()
 * 6. Event handlers use @EventSourcingHandler decorator
 * 
 * This example shows inventory management with:
 * - Product creation and stock management
 * - Automatic reordering when stock is low
 * - Projections for inventory views
 */
async function main(): Promise<void> {
  const options = parseOptions();
  const client = await createClient(options);

  // Register all event types with the serializer
  EventSerializer.registerEvent("ProductCreated", ProductCreated as any);
  EventSerializer.registerEvent("StockReceived", StockReceived as any);
  EventSerializer.registerEvent("StockSold", StockSold as any);
  EventSerializer.registerEvent("ReorderTriggered", ReorderTriggered as any);

  const factory = new RepositoryFactory(client);
  const productRepo = factory.createRepository(() => new ProductAggregate(), "Product");
  const inventoryProjection = new InventoryProjection();

  try {
    console.log("📦 Complete Inventory Management System (ADR-004 Pattern)");
    console.log("=========================================================");

    // Create products using commands
    const products = [
      { name: "Laptop", sku: "LAP001", reorderLevel: 5 },
      { name: "Mouse", sku: "MOU001", reorderLevel: 20 },
      { name: "Keyboard", sku: "KEY001", reorderLevel: 10 }
    ];

    const productIds = [];
    for (const productData of products) {
      const productId = `product-${randomUUID()}`;
      productIds.push(productId);

      // Create new product using CreateProductCommand
      let product = new ProductAggregate();
      const createCommand = new CreateProductCommand(
        productId,
        productData.name,
        productData.sku,
        productData.reorderLevel
      );
      (product as any).handleCommand(createCommand);
      await productRepo.save(product);

      // Receive initial stock using ReceiveStockCommand
      product = (await productRepo.load(productId))!;
      const receiveCommand = new ReceiveStockCommand(productId, 50, "supplier-main");
      (product as any).handleCommand(receiveCommand);
      await productRepo.save(product);

      console.log(`📦 Created ${productData.name} with 50 units (reorder at ${productData.reorderLevel})`);
    }

    // Simulate sales using commands
    console.log("\n🛒 Simulating sales activity...");
    for (let i = 0; i < 20; i++) {
      const productId = productIds[i % productIds.length];
      let product = await productRepo.load(productId);

      if (product && product.getCurrentStock() > 0) {
        const quantity = Math.min(Math.floor(Math.random() * 5) + 1, product.getCurrentStock());

        // Sell stock using SellStockCommand
        const sellCommand = new SellStockCommand(productId, quantity, `order-${i}`);
        (product as any).handleCommand(sellCommand);
        await productRepo.save(product);

        // Check if reorder needed
        if (product.needsReorder()) {
          const reorderQty = product.getReorderLevel() * 3; // Order 3x reorder level

          // Trigger reorder using TriggerReorderCommand
          product = (await productRepo.load(productId))!;
          const reorderCommand = new TriggerReorderCommand(productId, reorderQty, "supplier-main");
          (product as any).handleCommand(reorderCommand);
          await productRepo.save(product);

          // Simulate delivery using ReceiveStockCommand
          product = (await productRepo.load(productId))!;
          const deliveryCommand = new ReceiveStockCommand(productId, reorderQty, "supplier-main");
          (product as any).handleCommand(deliveryCommand);
          await productRepo.save(product);

          console.log(`🔄 Auto-reordered ${reorderQty} units of ${product.getName()}`);
        }
      }
    }

    // Build projections
    console.log("\n📊 Building inventory projections...");
    const allEvents = [];
    for (const productId of productIds) {
      const events = await client.readEvents(`Product-${productId}`);
      allEvents.push(...events);
    }

    allEvents.forEach(event => inventoryProjection.processEvent(event));

    // Display results
    console.log("\n📋 FINAL INVENTORY STATUS:");
    const inventory = inventoryProjection.getAllProducts();
    inventory.forEach(item => {
      const status = item.needsReorder ? "⚠️  LOW" : "✅ OK";
      console.log(`   ${item.name} (${item.sku}): ${item.currentStock} units ${status}`);
      console.log(`      Sold: ${item.totalSold}, Received: ${item.totalReceived}, Reorder Level: ${item.reorderLevel}`);
    });

    const lowStock = inventoryProjection.getLowStockProducts();
    console.log(`\n🔔 LOW STOCK ALERTS: ${lowStock.length} products need attention`);
    lowStock.forEach(item => {
      console.log(`   ⚠️  ${item.name}: ${item.currentStock} units (reorder at ${item.reorderLevel})`);
    });

    console.log("\n🎉 Inventory management example completed!");
    console.log("💡 Demonstrates: Stock tracking, automatic reordering, inventory projections");
    console.log("✅ Pattern: ADR-004 compliant (Commands → @CommandHandler → apply() → @EventSourcingHandler)");

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
