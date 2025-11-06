"""Tests for CompleteTask feature"""

import sys
import os
import pytest

# Add parent directory to path to import TaskAggregate
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from CreateTaskCommand import CreateTaskCommand
from CompleteTaskCommand import CompleteTaskCommand
from CompleteTaskEvent import CompleteTaskEvent
from TaskAggregate import TaskAggregate


class TestCompleteTask:
    """Tests for CompleteTask feature - ADR-004 Compliant"""

    def test_create_command(self):
        """Test command creation"""
        command = CompleteTaskCommand(
            id="test_id",
        )
        assert command.id == "test_id"

    def test_create_event(self):
        """Test event creation"""
        event = CompleteTaskEvent(
            id="test_id",
        )
        assert event.id == "test_id"

    def test_aggregate_complete_task(self):
        """Test aggregate complete command handler"""
        # Create aggregate and task
        aggregate = TaskAggregate()
        create_cmd = CreateTaskCommand(id="task-1", title="Test Task")
        aggregate.create_task(create_cmd)
        
        # Complete the task
        complete_cmd = CompleteTaskCommand(id="task-1")
        aggregate.complete_task(complete_cmd)
        
        # Verify state
        assert aggregate.is_completed()
        assert not aggregate.is_deleted()
    
    def test_aggregate_validation(self):
        """Test aggregate business rule validation"""
        aggregate = TaskAggregate()
        
        # Test: Cannot complete non-existent task
        with pytest.raises(ValueError, match="does not exist"):
            command = CompleteTaskCommand(id="task-1")
            aggregate.complete_task(command)
        
        # Test: Cannot complete already completed task
        aggregate = TaskAggregate()
        create_cmd = CreateTaskCommand(id="task-1", title="Test Task")
        aggregate.create_task(create_cmd)
        complete_cmd = CompleteTaskCommand(id="task-1")
        aggregate.complete_task(complete_cmd)
        
        with pytest.raises(ValueError, match="already completed"):
            aggregate.complete_task(complete_cmd)
