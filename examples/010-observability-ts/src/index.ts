import { randomUUID } from "crypto";
import pino, { Logger } from "pino";
import {
  Aggregate,
  AggregateRoot,
  BaseDomainEvent,
  CommandHandler,
  EventSourcingHandler,
  EventSerializer,
  EventStoreClient,
  MemoryEventStoreClient,
  RepositoryFactory,
  Repository,
} from "@event-sourcing-platform/typescript";

// ============================================================================
// INFRASTRUCTURE: Logging
// ============================================================================

/**
 * Logger interface for dependency injection
 * Allows swapping between Pino, Winston, or custom implementations
 */
export interface ILogger {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  child(bindings: object): ILogger;
}

/**
 * Pino logger adapter
 * Production-ready structured logging with excellent performance
 */
export class PinoLogger implements ILogger {
  constructor(private logger: Logger) {}

  debug(obj: object, msg?: string): void {
    this.logger.debug(obj, msg);
  }

  info(obj: object, msg?: string): void {
    this.logger.info(obj, msg);
  }

  warn(obj: object, msg?: string): void {
    this.logger.warn(obj, msg);
  }

  error(obj: object, msg?: string): void {
    this.logger.error(obj, msg);
  }

  child(bindings: object): ILogger {
    return new PinoLogger(this.logger.child(bindings));
  }
}

/**
 * Create configured logger
 * - Pretty print for development
 * - JSON for production
 * - File output option
 */
function createLogger(): ILogger {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const isProd = process.env.NODE_ENV === 'production';

  const pinoLogger = pino({
    level: logLevel,
    transport: !isProd ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      }
    } : undefined,
  });

  return new PinoLogger(pinoLogger);
}

// ============================================================================
// DOMAIN: Order Events
// ============================================================================

class OrderPlacedEvent extends BaseDomainEvent {
  readonly eventType = "OrderPlaced" as const;
  readonly schemaVersion = 1 as const;

  constructor(
    public orderId: string,
    public customerId: string,
    public items: Array<{ productId: string; quantity: number; price: number }>,
    public totalAmount: number
  ) {
    super();
  }
}

class OrderShippedEvent extends BaseDomainEvent {
  readonly eventType = "OrderShipped" as const;
  readonly schemaVersion = 1 as const;

  constructor(
    public trackingNumber: string,
    public shippedAt: Date
  ) {
    super();
  }
}

class OrderCancelledEvent extends BaseDomainEvent {
  readonly eventType = "OrderCancelled" as const;
  readonly schemaVersion = 1 as const;

  constructor(
    public reason: string,
    public cancelledAt: Date
  ) {
    super();
  }
}

type OrderEvent = OrderPlacedEvent | OrderShippedEvent | OrderCancelledEvent;

// ============================================================================
// DOMAIN: Order Commands
// ============================================================================

class PlaceOrderCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly customerId: string,
    public readonly items: Array<{ productId: string; quantity: number; price: number }>
  ) {}
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

// ============================================================================
// DOMAIN: Order Aggregate
// ============================================================================

enum OrderStatus {
  Pending = "Pending",
  Placed = "Placed",
  Shipped = "Shipped",
  Cancelled = "Cancelled",
}

@Aggregate("Order")
class OrderAggregate extends AggregateRoot<OrderEvent> {
  private status: OrderStatus = OrderStatus.Pending;
  private customerId: string | null = null;
  private items: Array<{ productId: string; quantity: number; price: number }> = [];
  private totalAmount: number = 0;
  private trackingNumber: string | null = null;
  private logger: ILogger | null = null;

  getAggregateType(): string {
    return "Order";
  }

  setLogger(logger: ILogger): void {
    this.logger = logger.child({ aggregateType: 'Order' });
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', obj: object, msg: string): void {
    if (this.logger) {
      this.logger[level](obj, msg);
    }
  }

  // COMMAND HANDLER: Place Order
  @CommandHandler("PlaceOrderCommand")
  placeOrder(command: PlaceOrderCommand): void {
    this.log('debug', { command, currentStatus: this.status }, 'PlaceOrder command received');

    // Validation
    if (this.id !== null) {
      this.log('warn', { orderId: this.id }, 'Attempted to place already placed order');
      throw new Error("Order already placed");
    }

    if (!command.items || command.items.length === 0) {
      this.log('warn', { command }, 'Attempted to place order with no items');
      throw new Error("Order must have at least one item");
    }

    if (!command.customerId) {
      this.log('warn', { command }, 'Attempted to place order without customer ID');
      throw new Error("Customer ID is required");
    }

    // Calculate total
    const totalAmount = command.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    this.log('info', 
      { orderId: command.aggregateId, customerId: command.customerId, totalAmount, itemCount: command.items.length },
      'Placing order'
    );

    // Initialize and emit event
    this.initialize(command.aggregateId);
    this.apply(new OrderPlacedEvent(
      command.aggregateId,
      command.customerId,
      command.items,
      totalAmount
    ));

    this.log('info', { orderId: command.aggregateId }, 'Order placed successfully');
  }

  // COMMAND HANDLER: Ship Order
  @CommandHandler("ShipOrderCommand")
  shipOrder(command: ShipOrderCommand): void {
    this.log('debug', { command, currentStatus: this.status, orderId: this.id }, 'ShipOrder command received');

    // Validation
    if (!this.id) {
      this.log('warn', { command }, 'Attempted to ship non-existent order');
      throw new Error("Order not placed");
    }

    if (this.status !== OrderStatus.Placed) {
      this.log('warn',
        { orderId: this.id, currentStatus: this.status, expectedStatus: OrderStatus.Placed },
        'Cannot ship order in current status'
      );
      throw new Error(`Cannot ship order in status: ${this.status}`);
    }

    this.log('info', { orderId: this.id, trackingNumber: command.trackingNumber }, 'Shipping order');

    this.apply(new OrderShippedEvent(command.trackingNumber, new Date()));

    this.log('info', { orderId: this.id, trackingNumber: command.trackingNumber }, 'Order shipped successfully');
  }

  // COMMAND HANDLER: Cancel Order
  @CommandHandler("CancelOrderCommand")
  cancelOrder(command: CancelOrderCommand): void {
    this.log('debug', { command, currentStatus: this.status, orderId: this.id }, 'CancelOrder command received');

    // Validation
    if (!this.id) {
      this.log('warn', { command }, 'Attempted to cancel non-existent order');
      throw new Error("Order not placed");
    }

    if (this.status === OrderStatus.Shipped) {
      this.log('warn', { orderId: this.id, currentStatus: this.status }, 'Cannot cancel shipped order');
      throw new Error("Cannot cancel shipped order");
    }

    if (this.status === OrderStatus.Cancelled) {
      this.log('warn', { orderId: this.id }, 'Order already cancelled');
      throw new Error("Order is already cancelled");
    }

    this.log('info', { orderId: this.id, reason: command.reason }, 'Cancelling order');

    this.apply(new OrderCancelledEvent(command.reason, new Date()));

    this.log('info', { orderId: this.id, reason: command.reason }, 'Order cancelled successfully');
  }

  // EVENT SOURCING HANDLER: Order Placed
  @EventSourcingHandler("OrderPlaced")
  private onOrderPlaced(event: OrderPlacedEvent): void {
    this.log('debug', { event }, 'Applying OrderPlaced event');
    this.status = OrderStatus.Placed;
    this.customerId = event.customerId;
    this.items = [...event.items];
    this.totalAmount = event.totalAmount;
    this.log('debug', { orderId: event.orderId, newStatus: this.status }, 'OrderPlaced event applied');
  }

  // EVENT SOURCING HANDLER: Order Shipped
  @EventSourcingHandler("OrderShipped")
  private onOrderShipped(event: OrderShippedEvent): void {
    this.log('debug', { event }, 'Applying OrderShipped event');
    this.status = OrderStatus.Shipped;
    this.trackingNumber = event.trackingNumber;
    this.log('debug', { orderId: this.id, newStatus: this.status, trackingNumber: this.trackingNumber }, 'OrderShipped event applied');
  }

  // EVENT SOURCING HANDLER: Order Cancelled
  @EventSourcingHandler("OrderCancelled")
  private onOrderCancelled(event: OrderCancelledEvent): void {
    this.log('debug', { event }, 'Applying OrderCancelled event');
    this.status = OrderStatus.Cancelled;
    this.log('debug', { orderId: this.id, newStatus: this.status, reason: event.reason }, 'OrderCancelled event applied');
  }

  // Getters
  getStatus(): OrderStatus {
    return this.status;
  }

  getCustomerId(): string | null {
    return this.customerId;
  }

  getTotalAmount(): number {
    return this.totalAmount;
  }

  getTrackingNumber(): string | null {
    return this.trackingNumber;
  }
}

// ============================================================================
// APPLICATION: Command Bus
// ============================================================================

class CommandBus {
  private logger: ILogger;

  constructor(
    private repository: Repository<OrderAggregate>,
    private aggregateFactory: () => OrderAggregate,
    logger: ILogger
  ) {
    this.logger = logger.child({ component: 'CommandBus' });
  }

  async send(command: PlaceOrderCommand | ShipOrderCommand | CancelOrderCommand): Promise<void> {
    const commandType = command.constructor.name;
    const commandId = randomUUID();

    this.logger.info(
      { commandId, commandType, aggregateId: command.aggregateId },
      'Command received'
    );

    try {
      // Load or create aggregate
      let aggregate = await this.repository.load(command.aggregateId);

      if (!aggregate) {
        this.logger.debug({ aggregateId: command.aggregateId }, 'Creating new aggregate');
        aggregate = this.aggregateFactory();
        aggregate.setLogger(this.logger);  // Set logger on new aggregate
      } else {
        this.logger.debug(
          { aggregateId: command.aggregateId, version: aggregate.version },
          'Loaded existing aggregate'
        );
        aggregate.setLogger(this.logger);  // Set logger on loaded aggregate
      }

      // Dispatch to @CommandHandler
      (aggregate as any).handleCommand(command);

      // Save (includes optimistic concurrency check)
      await this.repository.save(aggregate);

      this.logger.info(
        {
          commandId,
          commandType,
          aggregateId: command.aggregateId,
          newVersion: aggregate.version,
          eventsEmitted: aggregate.getUncommittedEvents().length
        },
        'Command processed successfully'
      );
    } catch (error) {
      this.logger.error(
        {
          commandId,
          commandType,
          aggregateId: command.aggregateId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        'Command processing failed'
      );
      throw error;
    }
  }
}

// ============================================================================
// MAIN EXAMPLE
// ============================================================================

async function main(): Promise<void> {
  // Create logger (supports DEBUG, INFO, WARN, ERROR levels)
  // Set LOG_LEVEL=debug for verbose output
  const logger = createLogger();

  logger.info({ example: '010-observability-ts' }, '🔍 Observability Example with Pino Logging');
  logger.info({}, '============================================');

  // Setup event store and repository
  const client = new MemoryEventStoreClient();
  await client.connect();
  logger.info({ eventStore: 'MemoryEventStoreClient' }, 'Connected to event store');

  // Register events
  EventSerializer.registerEvent("OrderPlaced", OrderPlacedEvent as unknown as new () => OrderPlacedEvent);
  EventSerializer.registerEvent("OrderShipped", OrderShippedEvent as unknown as new () => OrderShippedEvent);
  EventSerializer.registerEvent("OrderCancelled", OrderCancelledEvent as unknown as new () => OrderCancelledEvent);
  logger.debug({}, 'Event serializers registered');

  // Create repository
  const factory = new RepositoryFactory(client);
  const repository = factory.createRepository(
    () => new OrderAggregate(),
    "Order"
  );
  logger.debug({ aggregateType: 'Order' }, 'Repository created');

  // Create command bus
  const commandBus = new CommandBus(
    repository,
    () => new OrderAggregate(),
    logger
  );
  logger.debug({}, 'Command bus initialized');

  try {
    logger.info({}, '\n📝 Scenario 1: Place Order');
    const orderId1 = `order-${randomUUID()}`;
    await commandBus.send(new PlaceOrderCommand(
      orderId1,
      'customer-123',
      [
        { productId: 'laptop-001', quantity: 1, price: 999.99 },
        { productId: 'mouse-001', quantity: 2, price: 29.99 }
      ]
    ));

    logger.info({}, '\n📦 Scenario 2: Ship Order');
    await commandBus.send(new ShipOrderCommand(orderId1, 'TRACK-123456789'));

    logger.info({}, '\n📝 Scenario 3: Place Another Order');
    const orderId2 = `order-${randomUUID()}`;
    await commandBus.send(new PlaceOrderCommand(
      orderId2,
      'customer-456',
      [{ productId: 'keyboard-001', quantity: 1, price: 149.99 }]
    ));

    logger.info({}, '\n❌ Scenario 4: Cancel Order');
    await commandBus.send(new CancelOrderCommand(orderId2, 'Customer changed mind'));

    logger.info({}, '\n🚨 Scenario 5: Error Handling - Invalid Command');
    try {
      await commandBus.send(new PlaceOrderCommand(orderId1, 'customer-789', []));
    } catch (error) {
      logger.info({ handled: true }, 'Error was properly caught and logged');
    }

    logger.info({}, '\n✅ All scenarios completed!');
    logger.info({}, '\n💡 Key Observability Features Demonstrated:');
    logger.info({}, '   • Structured logging with Pino');
    logger.info({}, '   • Dependency injection for logger');
    logger.info({}, '   • Command tracing with correlation IDs');
    logger.info({}, '   • Business rule validation logging');
    logger.info({}, '   • Event emission logging');
    logger.info({}, '   • Aggregate state change logging');
    logger.info({}, '   • Error and exception logging');
    logger.info({}, '   • Debug level support (set LOG_LEVEL=debug)');

  } finally {
    await client.disconnect();
    logger.info({}, 'Disconnected from event store');
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Example failed", error);
    process.exitCode = 1;
  });
}

