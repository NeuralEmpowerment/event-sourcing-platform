# Example 001 — Basic Event Store & Aggregates (TypeScript)

This example demonstrates two approaches to using the Event Sourcing Platform:

1. **`index.ts`** - Direct event store usage (low-level API)
2. **`aggregate-example.ts`** - Aggregate with Command Handlers (recommended pattern)

## Prerequisites

```bash
./dev-tools/dev init   # first time only
./dev-tools/dev start
```

## Examples

### Example 1: Direct Event Store Usage

Minimal append/read/exists loop against the platform event store using the low-level client API.

**Run:**
```bash
cd examples/001-basic-store-ts
pnpm run build
pnpm run start        # Uses gRPC
pnpm run start -- --memory  # Uses in-memory store
```

**What it demonstrates:**
- Creating event envelopes with `EventFactory`
- Appending events directly to streams
- Reading events back from streams
- Optimistic concurrency control
- Stream existence checks

### Example 2: Aggregates with Command Handlers ⭐ **Recommended**

Demonstrates the proper Event Sourcing pattern with aggregates, command handlers, and the repository pattern.

**Run:**
```bash
cd examples/001-basic-store-ts
pnpm run dev:aggregate     # Development mode
pnpm run build && pnpm run start:aggregate  # Production
```

**What it demonstrates:**
- `@CommandHandler` decorators on aggregate methods
- `@EventSourcingHandler` decorators for state updates
- Commands as classes with `aggregateId`
- Business rule validation in command handlers
- State updates only in event handlers
- Repository pattern for loading/saving aggregates
- Event sourcing rehydration
- Separation of concerns (validation vs state)

**Key Pattern:**
```typescript
@Aggregate('User')
class UserAggregate extends AggregateRoot<UserEvent> {
  
  // COMMAND HANDLER - Validates and emits events
  @CommandHandler('RegisterUserCommand')
  register(command: RegisterUserCommand): void {
    if (!command.email.includes('@')) {
      throw new Error('Valid email required');
    }
    this.initialize(command.aggregateId);
    this.apply(new UserRegistered(...));
  }

  // EVENT HANDLER - Updates state only
  @EventSourcingHandler('UserRegistered')
  private onUserRegistered(event: UserRegistered): void {
    this.email = event.email;
    this.name = event.name;
  }
}
```

## Environment Variables

- `EVENT_STORE_ADDR` - gRPC endpoint (default: `127.0.0.1:50051`)
- `EVENT_STORE_TENANT` - Tenant ID (default: `example-tenant`)
- `EVENT_STORE_MODE` - Set to `memory` to use in-memory client

## Learning Path

1. **Start with `aggregate-example.ts`** to learn the recommended pattern
2. **Review `index.ts`** to understand the underlying event store API
3. **Explore VSA examples** in `/vsa/examples/` for complete applications

## Key Concepts

### Commands vs Events
- **Commands:** Express *intent* (e.g., "Register User")
  - Can be rejected
  - Handled by `@CommandHandler` methods
  - Contain validation logic

- **Events:** Record *facts* (e.g., "User Registered")
  - Cannot be rejected (already happened)
  - Handled by `@EventSourcingHandler` methods
  - Update state only, no validation

### Aggregate Responsibilities
- ✅ Enforce business rules in command handlers
- ✅ Emit domain events
- ✅ Update internal state via event handlers
- ✅ Maintain consistency boundaries
- ❌ No direct state modification in command handlers
- ❌ No validation in event handlers
- ❌ No external dependencies

## References

- [ADR-004: Command Handlers in Aggregates](/docs/adrs/ADR-004-command-handlers-in-aggregates.md)
- [Event Sourcing Documentation](/docs-site)
- [VSA Examples](/vsa/examples)
