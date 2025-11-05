# 010-observability-ts: Observability with Pino Logging

Production-ready observability patterns for event-sourced applications using structured logging with Pino.

## What You'll Learn

- **Structured Logging**: JSON-formatted logs for machine parsing and analysis
- **Log Levels**: DEBUG, INFO, WARN, ERROR with environment-based configuration
- **Dependency Injection**: Swap logging implementations without changing business logic
- **Command Tracing**: Track commands from receipt through completion
- **Event Visibility**: Log all event emissions and state changes
- **Error Tracking**: Comprehensive error logging with stack traces
- **Context Propagation**: Maintain context across async operations

## Features Demonstrated

### 1. Logger Abstraction

```typescript
// ILogger interface allows swapping between Pino, Winston, or custom implementations
export interface ILogger {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  child(bindings: object): ILogger;
}

// Pino adapter implements the interface
export class PinoLogger implements ILogger {
  constructor(private logger: Logger) {}
  // ... implementation
}
```

### 2. Structured Logging

All logs are structured JSON objects for easy parsing:

```json
{
  "level": 30,
  "time": 1699564800000,
  "component": "CommandBus",
  "commandId": "cmd-123",
  "commandType": "PlaceOrderCommand",
  "aggregateId": "order-456",
  "msg": "Command received"
}
```

### 3. Context Propagation

Loggers create child loggers with inherited context:

```typescript
// Root logger
const logger = createLogger();

// Component-specific logger (adds component: 'CommandBus')
const busLogger = logger.child({ component: 'CommandBus' });

// Aggregate-specific logger (adds aggregateType: 'Order')
const aggLogger = logger.child({ aggregateType: 'Order' });
```

### 4. Command Tracing

Every command gets a unique ID for end-to-end tracing:

```
[INFO] Command received - commandId: cmd-123, commandType: PlaceOrderCommand
[DEBUG] Validating command - commandId: cmd-123
[INFO] Placing order - orderId: order-456, totalAmount: 1059.97
[DEBUG] Applying OrderPlaced event
[INFO] Command processed successfully - commandId: cmd-123, eventsEmitted: 1
```

### 5. Error Logging

Comprehensive error tracking with context:

```typescript
catch (error) {
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
```

## Running the Example

### Basic Usage (INFO level)

```bash
cd examples/010-observability-ts
pnpm install
pnpm dev
```

### Debug Mode (verbose logging)

```bash
LOG_LEVEL=debug pnpm dev
```

### Production Mode (JSON output)

```bash
NODE_ENV=production pnpm start
```

## Output Examples

### INFO Level (Default)

```
[2024-01-15 10:30:00] INFO: 🔍 Observability Example with Pino Logging
[2024-01-15 10:30:00] INFO: Connected to event store
[2024-01-15 10:30:00] INFO (CommandBus): Command received
    commandId: "cmd-abc123"
    commandType: "PlaceOrderCommand"
    aggregateId: "order-xyz789"
[2024-01-15 10:30:00] INFO (Order): Placing order
    orderId: "order-xyz789"
    customerId: "customer-123"
    totalAmount: 1059.97
    itemCount: 2
[2024-01-15 10:30:00] INFO (CommandBus): Command processed successfully
    commandId: "cmd-abc123"
    newVersion: 1
    eventsEmitted: 1
```

### DEBUG Level (Verbose)

```
[2024-01-15 10:30:00] DEBUG (Order): PlaceOrder command received
    command: { aggregateId: "order-xyz789", customerId: "customer-123", items: [...] }
    currentStatus: "Pending"
[2024-01-15 10:30:00] DEBUG (Order): Applying OrderPlaced event
    event: { orderId: "order-xyz789", customerId: "customer-123", totalAmount: 1059.97 }
[2024-01-15 10:30:00] DEBUG (Order): OrderPlaced event applied
    orderId: "order-xyz789"
    newStatus: "Placed"
[2024-01-15 10:30:00] DEBUG (CommandBus): Loaded existing aggregate
    aggregateId: "order-xyz789"
    version: 1
```

## Observability Patterns

### 1. Log at Boundaries

Log when entering and exiting major components:

```typescript
this.logger.info({ commandId }, 'Command received');
// ... processing ...
this.logger.info({ commandId, result }, 'Command processed successfully');
```

### 2. Log Business Events

Log significant business occurrences:

```typescript
this.logger.info({ orderId, totalAmount }, 'Order placed');
this.logger.warn({ orderId, reason }, 'Order cancelled');
```

### 3. Log Errors with Context

Always include relevant context with errors:

```typescript
this.logger.error({ orderId, error, stack }, 'Order processing failed');
```

### 4. Use Appropriate Log Levels

- **DEBUG**: Internal state, detailed flow (development only)
- **INFO**: Business events, successful operations
- **WARN**: Recoverable errors, business rule violations
- **ERROR**: Exceptions, failures, system errors

### 5. Structure for Analysis

Use consistent field names across logs:

```typescript
{ orderId, customerId, commandType, aggregateType, eventType }
```

## Integration with Monitoring

### Exporting to Centralized Logging

```typescript
// File output
const pinoLogger = pino({
  level: 'info',
  transport: {
    targets: [
      { target: 'pino-pretty', options: { colorize: true } },
      { target: 'pino/file', options: { destination: './logs/app.log' } }
    ]
  }
});
```

### ELK Stack Integration

```typescript
// JSON format for Logstash/Elasticsearch
const pinoLogger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});
```

### Custom Transports

```typescript
// Send to external service
const pinoLogger = pino({
  transport: {
    target: './custom-transport.js',
    options: { endpoint: 'https://logs.example.com' }
  }
});
```

## Performance Considerations

**Pino is fast!**

- 5-10x faster than Winston
- Minimal overhead (~100ns per log)
- Async logging by default
- Zero-cost child loggers
- Efficient JSON serialization

**Production tips:**

- Use `NODE_ENV=production` (disables pretty printing)
- Set appropriate log levels (INFO in prod, DEBUG in dev)
- Use log sampling for high-frequency events
- Consider log rotation for file outputs

## Key Concepts Demonstrated

- ✅ Structured logging with Pino
- ✅ Dependency injection for swappable loggers
- ✅ Context propagation with child loggers
- ✅ Command tracing with correlation IDs
- ✅ Multi-level logging (DEBUG, INFO, WARN, ERROR)
- ✅ Error tracking with full context
- ✅ Business rule validation logging
- ✅ Event emission logging
- ✅ Aggregate state change logging
- ✅ Integration with external monitoring systems

## Next Steps

- Add Prometheus metrics for counters and histograms
- Integrate with distributed tracing (OpenTelemetry)
- Add health check endpoints
- Implement log sampling for high-volume events
- Set up centralized log aggregation (ELK, Grafana Loki)
- Add performance profiling with Clinic.js

## Learn More

- [Pino Documentation](https://getpino.io/)
- [Structured Logging Best Practices](https://www.dataset.com/blog/the-10-commandments-of-logging/)
- [Observability in Event-Sourced Systems](../docs/observability.md)
- [OpenTelemetry Integration](https://opentelemetry.io/docs/instrumentation/js/)

