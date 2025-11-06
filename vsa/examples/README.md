# VSA Examples

This directory contains working example applications that demonstrate Vertical Slice Architecture (VSA) patterns and best practices.

## Examples Overview

### 1. Todo List Manager (⭐ Beginner)
**Path:** `01-todo-list-ts/`  
**Complexity:** Simple, single bounded context  
**Focus:** VSA basics, event sourcing fundamentals

A simple todo list application that demonstrates:
- Basic vertical slice structure
- Command/Event/Handler pattern
- Event sourcing with aggregates
- Simple projections
- Testing strategies

**Start here if:** You're new to VSA or event sourcing.

---

### 2. Library Management System (⭐⭐ Intermediate) ✅ ADR-004 COMPLIANT
**Path:** `02-library-management-ts/`  
**Complexity:** Multi-context with integration events  
**Focus:** Bounded contexts, integration events, aggregates with @CommandHandler

A library management system with 3 bounded contexts and 3 aggregates:
- **Catalog:** `BookAggregate` - Manage books in the library
- **Lending:** `LoanAggregate` - Handle borrowing and returns
- **Notifications:** `NotificationAggregate` - Send alerts and reminders

Demonstrates:
- **ADR-004 pattern:** Command handlers integrated in aggregates
- Multiple bounded contexts
- Integration events (single source of truth)
- Event subscribers for cross-context communication
- Context boundaries (no direct imports between contexts)
- `@Aggregate`, `@CommandHandler`, `@EventSourcingHandler` decorators
- Complete aggregate lifecycle

**Start here if:** You understand VSA basics and want to learn about bounded contexts with proper aggregate patterns.

---

### 3. E-commerce Platform (⭐⭐⭐ Advanced)
**Path:** `03-ecommerce-platform-ts/`  
**Complexity:** Complex, production-ready patterns  
**Focus:** Sagas, complex workflows, microservices

A complete e-commerce platform with 5 bounded contexts:
- **Catalog:** Product management
- **Inventory:** Stock management
- **Orders:** Order processing with saga orchestration
- **Payments:** Payment processing
- **Shipping:** Shipment tracking

Demonstrates:
- Saga orchestration for complex workflows
- Multiple integration events
- GraphQL and REST APIs
- Next.js frontend
- Docker Compose setup
- Comprehensive testing
- Production patterns

**Start here if:** You're building production systems and need advanced patterns.

---

### 4. Banking System (⭐⭐⭐⭐ Expert - Python)
**Path:** `04-banking-system-py/`  
**Complexity:** Enterprise patterns, Python implementation  
**Focus:** CQRS, sagas, fraud detection, Python SDK

A banking system with 4 bounded contexts:
- **Accounts:** Account management
- **Transactions:** Money transfers with saga orchestration
- **Fraud Detection:** Real-time fraud monitoring
- **Reporting:** CQRS read models and analytics

Demonstrates:
- Python implementation with VSA
- CQRS pattern (read/write separation)
- Saga orchestration for transfers
- Real-time event processing
- FastAPI backend
- Security and compliance patterns

**Start here if:** You need Python examples or enterprise patterns.

---

### 5. Todo List Manager (⭐ Beginner - Python) ✅ ADR-004 COMPLIANT
**Path:** `05-todo-list-py/`  
**Complexity:** Simple, single bounded context  
**Focus:** Python VSA basics with aggregate pattern

A simple todo list application demonstrating:
- **ADR-004 pattern:** TaskAggregate with @command_handler decorators
- Python decorators (`@aggregate`, `@command_handler`, `@event_sourcing_handler`)
- Command validation in aggregate methods
- Event sourcing handlers for state updates
- Type-safe Python with Pydantic
- VSA CLI code generation for Python

**Start here if:** You need a Python example following ADR-004 compliance.

---

## Getting Started

### Prerequisites

1. **Install VSA CLI:**
   ```bash
   cd vsa/vsa-cli
   cargo build --release
   sudo cp target/release/vsa /usr/local/bin/
   ```

2. **Install Event Sourcing Platform:**
   ```bash
   # For TypeScript examples
   npm install @event-sourcing-platform/typescript

   # For Python examples
   pip install event-sourcing-platform
   ```

3. **Install Docker & Docker Compose:**
   - Required for examples 2, 3, and 4

### Running an Example

Each example has its own README with detailed instructions. Generally:

```bash
# Navigate to example
cd 01-todo-list-ts/

# Read the README
cat README.md

# Install dependencies
npm install

# Run the application
npm start

# Run tests
npm test
```

## Learning Path

**Recommended order:**

1. **Start with Example 1 (Todo List)** - Learn VSA basics
2. **Move to Example 2 (Library)** - Understand bounded contexts
3. **Study Example 3 (E-commerce)** - Learn advanced patterns
4. **Explore Example 4 (Banking)** - See Python and enterprise patterns

## What You'll Learn

### Example 1: Fundamentals
- ✅ Vertical slice structure
- ✅ Command/Event/Handler pattern
- ✅ Event sourcing basics
- ✅ Aggregates
- ✅ Projections
- ✅ Testing vertical slices

### Example 2: Bounded Contexts
- ✅ Multiple bounded contexts
- ✅ Integration events (single source of truth)
- ✅ Event subscribers
- ✅ Context boundaries
- ✅ REST API integration
- ✅ Frontend integration

### Example 3: Advanced Patterns
- ✅ Saga orchestration
- ✅ Complex workflows
- ✅ Multiple integration points
- ✅ GraphQL and REST
- ✅ Modern frontend (Next.js)
- ✅ Production deployment
- ✅ Monitoring and observability

### Example 4: Enterprise & Python
- ✅ CQRS pattern
- ✅ Read/write separation
- ✅ Python implementation
- ✅ Real-time processing
- ✅ Fraud detection
- ✅ Security patterns
- ✅ Compliance considerations

## Architecture Patterns Demonstrated

### 1. Vertical Slice Architecture
All examples follow VSA principles:
- Features organized by business capability
- Each slice contains all layers (command, domain, handler, tests)
- Minimized dependencies between slices

### 2. Event Sourcing
- All state changes captured as events
- Event store as source of truth
- Aggregates reconstruct state from events
- Event replay capabilities

### 3. CQRS (Examples 3 & 4)
- Separate read and write models
- Projections for queries
- Optimized for different access patterns

### 4. Bounded Contexts (Examples 2, 3, 4)
- Clear context boundaries
- Integration events for communication
- No direct cross-context dependencies

### 5. Saga Pattern (Examples 3 & 4)
- Complex workflow orchestration
- Compensation logic for failures
- Distributed transaction handling

## Code Structure

Each example follows this structure:

```
example-name/
├── vsa.yaml                    # VSA configuration
├── package.json / pyproject.toml
├── docker-compose.yml          # Infrastructure setup
├── README.md                   # Example-specific docs
├── src/
│   ├── contexts/
│   │   ├── context-name/
│   │   │   ├── feature-name/
│   │   │   │   ├── Command.ts
│   │   │   │   ├── Event.ts
│   │   │   │   ├── Handler.ts
│   │   │   │   ├── Aggregate.ts (if applicable)
│   │   │   │   └── test.ts
│   │   │   └── _subscribers/
│   │   └── ...
│   ├── _shared/
│   │   └── integration-events/
│   ├── api/ (if applicable)
│   └── infrastructure/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    └── architecture.md
```

## Testing

Each example includes:
- **Unit tests:** Test individual handlers and aggregates
- **Integration tests:** Test feature flows
- **E2E tests:** Test complete user workflows

Run tests:
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests only
```

## Docker Support

Examples 2, 3, and 4 include Docker Compose setups:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Contributing

Found an issue or want to improve an example?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

## Support

- **Documentation:** See `/docs` in each example
- **Issues:** https://github.com/neuralempowerment/event-sourcing-platform/issues
- **Discussions:** https://github.com/neuralempowerment/event-sourcing-platform/discussions

## License

MIT

