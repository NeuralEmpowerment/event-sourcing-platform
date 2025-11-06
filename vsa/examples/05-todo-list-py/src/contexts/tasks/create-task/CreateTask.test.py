"""Tests for CreateTask feature"""

import sys
import os
import pytest

# Add parent directory to path to import TaskAggregate
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from CreateTaskCommand import CreateTaskCommand
from TaskCreatedEvent import TaskCreatedEvent
from TaskAggregate import TaskAggregate


class TestCreateTask:
    """Tests for CreateTask feature - ADR-004 Compliant"""

    def test_create_command(self):
        """Test command creation"""
        command = CreateTaskCommand(
            id="test_id",
            title="Test Task"
        )
        assert command.id == "test_id"
        assert command.title == "Test Task"

    def test_create_event(self):
        """Test event creation"""
        event = TaskCreatedEvent(
            id="test_id",
            title="Test Task"
        )
        assert event.id == "test_id"
        assert event.title == "Test Task"

    def test_aggregate_create_task(self):
        """Test aggregate command handler"""
        # Create aggregate
        aggregate = TaskAggregate()
        
        # Create command
        command = CreateTaskCommand(
            id="task-1",
            title="Test Task",
            description="Test Description"
        )
        
        # Dispatch command to aggregate
        aggregate.create_task(command)
        
        # Verify state
        assert aggregate.get_task_id() == "task-1"
        assert aggregate.title == "Test Task"
        assert aggregate.description == "Test Description"
        assert not aggregate.is_completed()
        assert not aggregate.is_deleted()
    
    def test_aggregate_validation(self):
        """Test aggregate business rule validation"""
        aggregate = TaskAggregate()
        
        # Test: Title is required
        with pytest.raises(ValueError, match="title is required"):
            command = CreateTaskCommand(id="task-1", title="")
            aggregate.create_task(command)
        
        # Test: Cannot create task twice
        aggregate = TaskAggregate()
        command1 = CreateTaskCommand(id="task-1", title="Test Task")
        aggregate.create_task(command1)
        
        with pytest.raises(ValueError, match="already exists"):
            command2 = CreateTaskCommand(id="task-1", title="Another Task")
            aggregate.create_task(command2)
