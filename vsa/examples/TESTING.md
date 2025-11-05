# VSA Examples - Testing Guide

This guide explains how to run E2E tests for the VSA examples using the real event-sourcing platform infrastructure.

## Overview

The examples demonstrate **complete E2E testing** with:
- ✅ Real event store (gRPC on port 50051)
- ✅ PostgreSQL backend for persistence
- ✅ Full vertical slice architecture
- ✅ Integration events across bounded contexts

## Prerequisites

Before running E2E tests, ensure you have:

1. **Docker and Docker Compose** installed
2. **Node.js 18+** and npm/pnpm
3. **Event Store platform** (from the main repo)

## Quick Start

### 1. Start Infrastructure

From the `vsa/examples/` directory:

```bash
make start-infra
```

This command will:
- Start the event store on `localhost:50051`
- Start PostgreSQL on `localhost:5432`
- Wait for services to be healthy

**Example Output:**
```
🚀 Starting event-store infrastructure...
[+] Running 2/2
 ✔ Container eventstore-postgres  Healthy
 ✔ Container event-store           Healthy
⏳ Waiting for event-store to be ready...
✅ Event store is ready!
✅ Infrastructure started successfully

Event Store gRPC: localhost:50051
PostgreSQL:       localhost:5432
```

### 2. Run Tests

#### All Examples

```bash
make test-all
```

#### Specific Example

```bash
# Todo List
make test-todo

# Library Management
make test-library
```

#### From Example Directory

```bash
cd 01-todo-list-ts
npm run test:e2e
```

### 3. Stop Infrastructure

```bash
make stop-infra
```

## Example 1: Todo List

### What It Tests

- ✅ Creating tasks with real event store
- ✅ Completing tasks
- ✅ Deleting tasks
- ✅ Event persistence across app restarts
- ✅ Optimistic concurrency
- ✅ Error handling

### Running Tests

```bash
cd 01-todo-list-ts

# Install dependencies
npm install

# Run E2E tests (infrastructure must be running)
npm run test:e2e
```

### Test Output

```
PASS  tests/e2e/todoFlow.e2e.test.ts
  Todo List E2E Tests
    Complete Todo Workflow
      ✓ should create, complete, and delete a task (523ms)
      ✓ should handle multiple tasks (412ms)
      ✓ should persist events across application restarts (287ms)
    Error Handling
      ✓ should handle non-existent task gracefully (156ms)
      ✓ should handle optimistic concurrency (298ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

## Example 2: Library Management

### What It Tests

#### Catalog Context
- ✅ Adding books to catalog
- ✅ Removing books from catalog
- ✅ Duplicate prevention
- ✅ Integration event publishing (`catalog.BookAdded`, `catalog.BookRemoved`)

#### Lending Context
- ✅ Borrowing books
- ✅ Returning books
- ✅ Marking loans as overdue
- ✅ Due date validation
- ✅ Double-return prevention
- ✅ Integration event publishing (`lending.BookBorrowed`, `lending.BookReturned`, `lending.BookOverdue`)

#### Notifications Context
- ✅ Subscribing to lending events
- ✅ Sending notifications automatically
- ✅ Cross-context communication

#### Full Workflow
- ✅ Add book → Borrow → Notifications sent
- ✅ Return book → Notification sent
- ✅ Overdue → Notification sent

### Running Tests

```bash
cd 02-library-management-ts

# Install dependencies
npm install

# Run E2E tests (infrastructure must be running)
npm run test:e2e
```

### Test Output

```
PASS  tests/e2e/library.e2e.test.ts
  Library Management E2E Tests
    Catalog Context
      ✓ should add a book to the catalog (389ms)
      ✓ should remove a book from the catalog (512ms)
      ✓ should prevent adding duplicate books (298ms)
    Lending Context
      ✓ should borrow and return a book (445ms)
      ✓ should mark a loan as overdue (367ms)
    Cross-Context Integration
      ✓ should send notifications when borrowing a book (601ms)
      ✓ should handle the complete library workflow (723ms)
    Error Handling
      ✓ should handle invalid commands gracefully (145ms)
      ✓ should prevent borrowing with invalid due date (178ms)
      ✓ should prevent double returns (289ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

## Architecture Patterns Demonstrated

### Event Sourcing
- All state changes are persisted as events
- Events are immutable
- Full audit trail

### CQRS
- Commands modify state
- Queries read from projections
- Clear separation

### Vertical Slice Architecture
- Each feature is self-contained
- Commands, events, handlers, tests co-located
- Easy to understand and maintain

### Bounded Contexts (Library example)
- `Catalog`: Book management
- `Lending`: Loan management
- `Notifications`: User notifications
- Clear boundaries, communication via integration events

### Integration Events
- Single source of truth (defined in `_shared`)
- Cross-context communication
- Event Bus for pub/sub

## Troubleshooting

### Event Store Not Running

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:50051
```

**Solution:**
```bash
# Start infrastructure
make start-infra

# Verify it's running
make status
```

### Database Connection Issues

**Error:**
```
Error: Connection to PostgreSQL failed
```

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart infrastructure
make stop-infra
make start-infra
```

### Tests Hanging

**Solution:**
- Increase jest timeout (already set to 30-60s)
- Check event store logs: `docker logs event-store`
- Verify network connectivity

### Clean State

```bash
# Stop and remove volumes
make clean

# Restart fresh
make start-infra
```

## Test Configuration

### Environment Variables

```bash
# Event store address (default: localhost:50051)
export EVENT_STORE_ADDRESS=localhost:50051

# Tenant ID (default: per-example)
export TENANT_ID=my-tenant
```

### Jest Configuration

Both examples use:
- **Timeout**: 30-60 seconds for E2E tests
- **Run in Band**: Sequential execution (`--runInBand`)
- **Setup Files**: Custom setup with environment info

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Infrastructure
        run: |
          cd vsa/examples
          make start-infra
      
      - name: Run E2E Tests
        run: |
          cd vsa/examples
          make test-all
      
      - name: Stop Infrastructure
        if: always()
        run: |
          cd vsa/examples
          make stop-infra
```

## Performance Tips

1. **Use Unique Tenant IDs**: Tests auto-generate unique tenant IDs for isolation
2. **Parallel Execution**: Not recommended for E2E tests (use `--runInBand`)
3. **Clean Up**: Tests should clean up after themselves
4. **Health Checks**: Always wait for services to be ready

## Next Steps

- **Add More Tests**: Extend E2E coverage
- **Read Models**: Add projections for queries
- **REST API Tests**: Add API integration tests (Library example)
- **Load Testing**: Test performance under load
- **Monitoring**: Add observability

## Resources

- [Event Store Documentation](../../event-store/README.md)
- [VSA Core Concepts](../docs/CORE-CONCEPTS.md)
- [Examples README](./README.md)
- [Getting Started Guide](../docs/GETTING-STARTED.md)

