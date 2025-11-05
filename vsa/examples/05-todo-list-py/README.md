# VSA Todo List Example (Python)

⭐ **Beginner** - A simple todo list application demonstrating Vertical Slice Architecture with Event Sourcing in Python.

## Overview

This example demonstrates:
- **Vertical Slice Architecture** with Python
- **Event Sourcing** fundamentals
- **CQRS** pattern basics
- **VSA CLI** code generation for Python
- **Type-safe** Python with Pydantic

## Project Structure

```
05-todo-list-py/
├── pyproject.toml              # Python project configuration
├── vsa.yaml                    # VSA configuration
├── src/
│   └── contexts/
│       └── tasks/              # Tasks bounded context
│           ├── create-task/
│           │   ├── CreateTaskCommand.py
│           │   ├── TaskCreatedEvent.py
│           │   ├── CreateTaskHandler.py
│           │   └── CreateTask.test.py
│           ├── complete-task/
│           │   ├── CompleteTaskCommand.py
│           │   ├── CompleteTaskEvent.py
│           │   ├── CompleteTaskHandler.py
│           │   └── CompleteTask.test.py
│           └── delete-task/
│               ├── DeleteTaskCommand.py
│               ├── TaskDeletedEvent.py
│               ├── DeleteTaskHandler.py
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

### Commands

Commands represent intent:

```python
class CreateTaskCommand(BaseModel):
    """Command to create a task"""
    id: str
    title: str
    description: str
```

### Events

Events represent facts:

```python
class TaskCreatedEvent(DomainEvent):
    """Event representing task creation"""
    event_type: str = "TaskCreatedEvent"
    id: str
    title: str
    description: str
```

### Handlers

Handlers process commands and emit events:

```python
class CreateTaskHandler:
    """Handler for CreateTaskCommand"""
    
    def __init__(self, repository: Repository):
        self.repository = repository
    
    async def handle(self, command: CreateTaskCommand) -> None:
        """Process the command and emit events"""
        event = TaskCreatedEvent(
            id=command.id,
            title=command.title,
            description=command.description,
        )
        # Persist to event store
        await self.repository.save(event)
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

