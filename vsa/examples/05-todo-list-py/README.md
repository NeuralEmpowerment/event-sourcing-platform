# VSA Todo List Example (Python) ✅ ADR-004 COMPLIANT

⭐ **Beginner** - A simple todo list application demonstrating Vertical Slice Architecture with Event Sourcing in Python.

## Overview

This example demonstrates:
- **✅ ADR-004 Compliance**: Command handlers integrated in aggregates using decorators
- **Vertical Slice Architecture** with Python
- **Event Sourcing** fundamentals
- **CQRS** pattern basics
- **VSA CLI** code generation for Python
- **Type-safe** Python with Pydantic

### What You'll Learn

- `@aggregate` decorator for aggregate classes
- `@command_handler` decorators for command processing methods
- `@event_sourcing_handler` decorators for state updates
- Business validation in command handlers
- State-only updates in event sourcing handlers
- Commands as classes with `id` (aggregate_id) property

## Project Structure

```
05-todo-list-py/
├── pyproject.toml              # Python project configuration
├── vsa.yaml                    # VSA configuration
├── src/
│   └── contexts/
│       └── tasks/              # Tasks bounded context
│           ├── TaskAggregate.py          # ✅ Aggregate with @command_handler
│           ├── create-task/
│           │   ├── CreateTaskCommand.py
│           │   ├── TaskCreatedEvent.py
│           │   └── CreateTask.test.py
│           ├── complete-task/
│           │   ├── CompleteTaskCommand.py
│           │   ├── CompleteTaskEvent.py
│           │   └── CompleteTask.test.py
│           └── delete-task/
│               ├── DeleteTaskCommand.py
│               ├── TaskDeletedEvent.py
│               └── DeleteTask.test.py
└── tests/
    └── e2e/
        └── test_task_flow.py   # End-to-end tests
```

## Getting Started

### Prerequisites

- Python 3.11+
- `uv` (recommended) or `pip`

### Installation

```bash
# Install dependencies
pip install -e .

# Or with uv (faster)
uv pip install -e .
```

### Install Event Sourcing SDK

This example uses the event-sourcing Python SDK:

```bash
# From the root of the repo
cd ../../event-sourcing/python
pip install -e .
```

## Running the Example

### Generate New Features

Use the VSA CLI to generate new features:

```bash
# Generate a new feature
vsa generate -c tasks -f list-tasks

# Validate the structure
vsa validate
```

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest src/contexts/tasks/create-task/CreateTask.test.py
```

### Type Checking

```bash
# Run mypy
mypy src/
```

### Linting

```bash
# Run ruff
ruff check src/

# Auto-fix issues
ruff check --fix src/

# Format code
black src/
```

## Key Concepts

### Vertical Slices

Each feature is a complete vertical slice:

```python
create-task/
├── CreateTaskCommand.py    # What we want to do
├── TaskCreatedEvent.py      # What happened
├── CreateTaskHandler.py     # Business logic
└── CreateTask.test.py       # Tests
```

### TaskAggregate with @command_handler

The aggregate encapsulates all command handling logic:

```python
from event_sourcing.decorators import aggregate, command_handler, event_sourcing_handler

@aggregate('Task')
class TaskAggregate(AggregateRoot):
    """Task Aggregate - ADR-004 Compliant"""
    
    # COMMAND HANDLER - Business logic and validation
    @command_handler('CreateTaskCommand')
    def create_task(self, command: CreateTaskCommand) -> None:
        # 1. Validate business rules
        if not command.title or command.title.strip() == '':
            raise ValueError('Task title is required')
        if self.task_id is not None:
            raise ValueError('Task already exists')
        
        # 2. Initialize aggregate
        self._initialize(command.id)
        
        # 3. Apply event
        event = TaskCreatedEvent(
            event_type='TaskCreated',
            id=command.id,
            title=command.title,
            description=command.description
        )
        self._apply(event)
    
    # EVENT SOURCING HANDLER - State updates only
    @event_sourcing_handler('TaskCreated')
    def _on_task_created(self, event: TaskCreatedEvent) -> None:
        # NO validation - just state updates
        self.task_id = event.id
        self.title = event.title
        self.description = event.description
```

### Commands

Commands represent intent:

```python
class CreateTaskCommand(BaseModel):
    """Command to create a task"""
    id: str  # aggregate_id
    title: str
    description: Optional[str] = None
```

### Events

Events represent facts:

```python
class TaskCreatedEvent(DomainEvent):
    """Event representing task creation"""
    event_type: str = "TaskCreated"
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
```

## Testing

### Unit Tests

Test individual components in isolation:

```python
def test_create_command():
    """Test command creation"""
    command = CreateTaskCommand(
        id="task-1",
        title="Test Task",
        description="Test Description"
    )
    assert command.id == "task-1"
    assert command.title == "Test Task"
```

### Integration Tests

Test with in-memory event store:

```python
@pytest.mark.asyncio
async def test_handler_execution():
    """Test handler with in-memory event store"""
    client = EventStoreClientFactory.create_memory_client()
    await client.connect()
    
    repository = RepositoryFactory(client).create_repository(
        TaskAggregate,
        "Task"
    )
    
    handler = CreateTaskHandler(repository)
    command = CreateTaskCommand(
        id="task-1",
        title="Test Task",
        description="Test Description"
    )
    
    await handler.handle(command)
    
    # Verify event was stored
    events = await client.read_events("Task-task-1")
    assert len(events) == 1
```

## VSA CLI Usage

### Initialize New Project

```bash
vsa init --language python --with-framework
```

### Generate Feature

```bash
vsa generate -c tasks -f create-task
```

### Validate Structure

```bash
vsa validate
```

## Next Steps

1. **Add More Features**: Generate additional task operations
2. **Add Aggregates**: Use `TaskAggregate` for domain logic
3. **Add Projections**: Create read models for queries
4. **Add Integration Events**: Communicate between contexts
5. **Add E2E Tests**: Test complete workflows

## Resources

- [VSA Documentation](../../README.md)
- [Event Sourcing Python SDK](../../../event-sourcing/python/README.md)
- [VSA CLI Guide](../../vsa-cli/README.md)
- [Event Sourcing Patterns](../../../docs-site/docs/event-sourcing/)

## License

MIT

