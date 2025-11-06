"""Tests for DeleteTask feature"""

import sys
import os
import pytest

# Add parent directory to path to import TaskAggregate
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from CreateTaskCommand import CreateTaskCommand
from DeleteTaskCommand import DeleteTaskCommand
from TaskDeletedEvent import TaskDeletedEvent
from TaskAggregate import TaskAggregate


class TestDeleteTask:
    """Tests for DeleteTask feature - ADR-004 Compliant"""

    def test_create_command(self):
        """Test command creation"""
        command = DeleteTaskCommand(
            id="test_id",
        )
        assert command.id == "test_id"

    def test_create_event(self):
        """Test event creation"""
        event = TaskDeletedEvent(
            id="test_id",
        )
        assert event.id == "test_id"

    def test_aggregate_delete_task(self):
        """Test aggregate delete command handler"""
        # Create aggregate and task
        aggregate = TaskAggregate()
        create_cmd = CreateTaskCommand(id="task-1", title="Test Task")
        aggregate.create_task(create_cmd)
        
        # Delete the task
        delete_cmd = DeleteTaskCommand(id="task-1")
        aggregate.delete_task(delete_cmd)
        
        # Verify state
        assert aggregate.is_deleted()
    
    def test_aggregate_validation(self):
        """Test aggregate business rule validation"""
        aggregate = TaskAggregate()
        
        # Test: Cannot delete non-existent task
        with pytest.raises(ValueError, match="does not exist"):
            command = DeleteTaskCommand(id="task-1")
            aggregate.delete_task(command)
        
        # Test: Cannot delete already deleted task
        aggregate = TaskAggregate()
        create_cmd = CreateTaskCommand(id="task-1", title="Test Task")
        aggregate.create_task(create_cmd)
        delete_cmd = DeleteTaskCommand(id="task-1")
        aggregate.delete_task(delete_cmd)
        
        with pytest.raises(ValueError, match="already deleted"):
            aggregate.delete_task(delete_cmd)
