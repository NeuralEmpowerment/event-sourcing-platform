# Todo List Manager - VSA Example (⭐ Beginner)

A simple todo list application demonstrating **Vertical Slice Architecture** and **Event Sourcing** fundamentals.

## 🎯 What You'll Learn

- ✅ Vertical slice structure (one folder per feature)
- ✅ `@CommandHandler` pattern on aggregates
- ✅ Event sourcing with `@EventSourcingHandler` decorators
- ✅ CQRS with projections (read models)
- ✅ Repository pattern for loading/saving aggregates
- ✅ Testing vertical slices
- ✅ In-memory event store

## 📋 Features

- **Create Task** - Add new tasks with title, description, and due date
- **Complete Task** - Mark tasks as completed
- **Delete Task** - Remove tasks
- **List Tasks** - View all tasks with filtering options

## 🏗️ Architecture

### Vertical Slices

Each feature is organized as a complete vertical slice:

```
create-task/
├── CreateTaskCommand.ts    # Command (what we want to do)
├── TaskCreatedEvent.ts      # Event (what happened)
├── TaskAggregate.ts         # Aggregate with @CommandHandler methods
└── CreateTask.test.ts       # Tests
```

### Event Sourcing

Instead of storing current state, we store **events** (what happened):

```
Task Created → Task Completed → Task Deleted
```

The aggregate reconstructs state by replaying events.

### CQRS Pattern

- **Commands** (write): CreateTask, CompleteTask, DeleteTask
- **Queries** (read): ListTasks (uses projection)

Separate models for reading and writing!

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- VSA CLI (optional, for validation)

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Running the Application

```bash
# Create a task
npm start create "Buy groceries" --description "Milk, eggs, bread" --due 2025-12-31

# List tasks
npm start list

# Complete a task
npm start complete <task-id>

# Delete a task
npm start delete <task-id>

# List all tasks (including completed)
npm start list --all
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📁 Project Structure

```
01-todo-list-ts/
├── vsa.yaml                      # VSA configuration
├── package.json
├── src/
│   ├── contexts/
│   │   └── tasks/                # Tasks bounded context
│   │       ├── create-task/      # ✨ Vertical slice
│   │       │   ├── CreateTaskCommand.ts
│   │       │   ├── TaskCreatedEvent.ts
│   │       │   ├── TaskAggregate.ts (with @CommandHandler)
│   │       │   └── CreateTask.test.ts
│   │       ├── complete-task/    # ✨ Vertical slice
│   │       ├── delete-task/      # ✨ Vertical slice
│   │       └── list-tasks/       # ✨ Vertical slice (query)
│   ├── infrastructure/
│   │   ├── EventStore.ts         # Interface
│   │   ├── InMemoryEventStore.ts # Implementation
│   │   └── CommandBus.ts         # Command routing
│   └── index.ts                  # CLI entry point
└── tests/
    └── integration/
        └── todoFlow.test.ts      # End-to-end tests
```

## 🔍 Code Walkthrough

### 1. Creating a Task

**Command** (what we want to do) - Note: Commands are **classes** with `aggregateId`:
```typescript
class CreateTaskCommand {
  constructor(
    public readonly aggregateId: string,
    public readonly title: string,
    public readonly description?: string,
    public readonly dueDate?: Date
  ) {}
}
```

**Aggregate** with command handler (business logic):
```typescript
@Aggregate('Task')
class TaskAggregate extends AggregateRoot<TaskEvent> {
  
  // COMMAND HANDLER - Validates and emits events
  @CommandHandler('CreateTaskCommand')
  createTask(command: CreateTaskCommand): void {
    // 1. Validate business rules
    if (!command.title || command.title.trim() === '') {
      throw new Error('Task title is required');
    }
    if (this.id !== null) {
      throw new Error('Task already exists');
    }
    
    // 2. Initialize aggregate
    this.initialize(command.aggregateId);
    
    // 3. Apply event (triggers event handler)
    this.apply(new TaskCreatedEvent(
      command.aggregateId,
      command.title,
      command.description,
      command.dueDate
    ));
  }
  
  // EVENT SOURCING HANDLER - Updates state only
  @EventSourcingHandler('TaskCreated')
  private onTaskCreated(event: TaskCreatedEvent): void {
    // State update only - no validation
    this.title = event.title;
    this.description = event.description;
    this.createdAt = event.createdAt;
  }
}
```

**Event** (what happened):
```typescript
interface TaskCreatedEvent {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  createdAt: Date;
}
```

### 2. Command Routing with Repository

**CommandBus** routes commands to aggregates:
```typescript
class CommandBus {
  async send(command: Command): Promise<void> {
    // 1. Load or create aggregate
    let aggregate = await this.repository.load(command.aggregateId);
    if (!aggregate) {
      aggregate = new TaskAggregate();
    }
    
    // 2. Dispatch to @CommandHandler
    aggregate.handleCommand(command);
    
    // 3. Save (persists uncommitted events)
    await this.repository.save(aggregate);
  }
}
```

**Key Pattern**: Commands → Aggregate → Events → Repository

### 3. CQRS with Projections

**Projection** (read model) for queries:
```typescript
class TasksProjection {
  async getAllTasks(): Promise<TaskView[]> {
    // Get all events
    const events = await this.eventStore.getAllEvents();
    
    // Rebuild aggregates
    // Convert to view models
    return tasks;
  }
}
```

**Query Handler**:
```typescript
class ListTasksHandler {
  async handle(query: ListTasksQuery): Promise<TaskView[]> {
    let tasks = await this.projection.getAllTasks();
    
    // Apply filters
    if (!query.includeCompleted) {
      tasks = tasks.filter(t => !t.completed);
    }
    
    return tasks;
  }
}
```

## 🧪 Testing Strategy

### Unit Tests

Each vertical slice has its own tests:

```typescript
describe('CreateTask', () => {
  it('should create a task successfully', async () => {
    // Arrange
    const command = { id: 'task-1', title: 'Test' };
    
    // Act
    await handler.handle(command);
    
    // Assert
    const events = await eventStore.getEvents('task-1');
    expect(events[0].type).toBe('TaskCreated');
  });
});
```

### Integration Tests

Test complete workflows:

```typescript
it('should handle complete task lifecycle', async () => {
  // Create → Complete → Delete
  await createHandler.handle({ id: 'task-1', title: 'Test' });
  await completeHandler.handle({ id: 'task-1' });
  await deleteHandler.handle({ id: 'task-1' });
  
  // Verify event history
  const events = await eventStore.getEvents('task-1');
  expect(events).toHaveLength(3);
});
```

## 🎓 Key Concepts Demonstrated

### 1. Vertical Slice Architecture
- Each feature is self-contained
- All layers in one folder
- Easy to understand and maintain

### 2. Command Handler Pattern
- `@CommandHandler` decorators on aggregate methods
- Commands are classes with `aggregateId`
- Business validation in command handlers
- Aggregates emit events via `this.apply()`

### 3. Event Sourcing
- `@EventSourcingHandler` decorators update state
- Events are the source of truth
- State is reconstructed from events
- Complete audit log

### 4. CQRS
- Separate read and write models
- Commands change state (via aggregates)
- Queries read projections
- Repository pattern for aggregate persistence

### 5. Domain-Driven Design
- Aggregates enforce business rules
- Events represent domain occurrences
- Commands express intent
- Clear separation: validation (commands) vs state (events)

## 📚 Next Steps

1. **Try the CLI**: Create, complete, and delete tasks
2. **Read the tests**: See how features are tested
3. **Modify a feature**: Add a new field or validation rule
4. **Generate a feature**: Use `vsa generate` to add a new vertical slice
5. **Move to Example 2**: Learn about bounded contexts

## 🔗 Related Examples

- **Next:** [Example 2 - Library Management](../02-library-management-ts/) (⭐⭐ Intermediate)
  - Multiple bounded contexts
  - Integration events
  - REST API

## 📖 Documentation

- [Vertical Slice Architecture](../../docs/vertical-slice-architecture.md)
- [Event Sourcing Guide](../../docs/event-sourcing.md)
- [CQRS Pattern](../../docs/cqrs.md)
- [Testing Strategies](../../docs/testing.md)

## ❓ Common Questions

**Q: Why use events instead of just updating a database?**  
A: Events give you complete history, audit logs, and the ability to replay/rebuild state. Great for debugging and compliance!

**Q: Is in-memory event store production-ready?**  
A: No! This is for learning. Use EventStoreDB, PostgreSQL, or similar in production.

**Q: Why separate commands and queries?**  
A: CQRS allows different models optimized for writing vs reading. Improves performance and scalability.

**Q: How do I add a new feature?**  
A: Use `vsa generate tasks new-feature` to scaffold a new vertical slice!

## 🐛 Troubleshooting

**Tests failing?**
```bash
npm install
npm test
```

**TypeScript errors?**
```bash
npm run build
```

**Want to validate structure?**
```bash
vsa validate
```

## 📄 License

MIT

