# Todo List Manager - VSA Example (⭐ Beginner)

A simple todo list application demonstrating **Vertical Slice Architecture** and **Event Sourcing** fundamentals.

## 🎯 What You'll Learn

- ✅ Vertical slice structure (one folder per feature)
- ✅ Command/Event/Handler pattern
- ✅ Event sourcing with aggregates
- ✅ CQRS with projections (read models)
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
├── CreateTaskCommand.ts    # What we want to do
├── TaskCreatedEvent.ts      # What happened
├── CreateTaskHandler.ts     # How to do it
├── TaskAggregate.ts         # Domain model
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
│   │       │   ├── CreateTaskHandler.ts
│   │       │   ├── TaskAggregate.ts
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

**Command** (what we want to do):
```typescript
interface CreateTaskCommand {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
}
```

**Handler** (business logic):
```typescript
class CreateTaskHandler {
  async handle(command: CreateTaskCommand): Promise<void> {
    // 1. Validate
    this.validateCommand(command);
    
    // 2. Check if task exists
    const existing = await this.eventStore.getEvents(command.id);
    if (existing.length > 0) {
      throw new Error('Task already exists');
    }
    
    // 3. Create event
    const event: TaskCreatedEvent = {
      id: command.id,
      title: command.title,
      createdAt: new Date(),
    };
    
    // 4. Store event
    await this.eventStore.appendEvent(command.id, 'TaskCreated', event);
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

### 2. Event Sourcing with Aggregates

**Aggregate** reconstructs state from events:
```typescript
class TaskAggregate {
  private completed: boolean = false;
  
  applyTaskCreated(event: TaskCreatedEvent): void {
    this.id = event.id;
    this.title = event.title;
    this.createdAt = event.createdAt;
  }
  
  applyTaskCompleted(event: TaskCompletedEvent): void {
    this.completed = true;
    this.completedAt = event.completedAt;
  }
}
```

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

### 2. Event Sourcing
- Events are the source of truth
- State is reconstructed from events
- Complete audit log

### 3. CQRS
- Separate read and write models
- Commands change state
- Queries read projections

### 4. Domain-Driven Design
- Aggregates enforce business rules
- Events represent domain occurrences
- Commands express intent

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

