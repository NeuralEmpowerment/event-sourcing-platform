"""Task Aggregate - Manages the lifecycle of a task using event sourcing

This aggregate follows ADR-004 pattern:
- Command handlers integrated in the aggregate using @command_handler decorator
- Business validation in command handlers
- State updates only in event sourcing handlers
"""

import sys
import os
from typing import Optional
from event_sourcing.decorators import aggregate, command_handler, event_sourcing_handler
from event_sourcing.core.aggregate import AggregateRoot

# Add subdirectories to path to import from directories with dashes
_current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_current_dir, 'create-task'))
sys.path.insert(0, os.path.join(_current_dir, 'complete-task'))
sys.path.insert(0, os.path.join(_current_dir, 'delete-task'))

from CreateTaskCommand import CreateTaskCommand
from TaskCreatedEvent import TaskCreatedEvent
from CompleteTaskCommand import CompleteTaskCommand
from CompleteTaskEvent import CompleteTaskEvent
from DeleteTaskCommand import DeleteTaskCommand
from TaskDeletedEvent import TaskDeletedEvent


@aggregate('Task')
class TaskAggregate(AggregateRoot):
    """Task Aggregate - Handles task commands and applies events
    
    This aggregate demonstrates ADR-004 compliance:
    - @command_handler decorators for command processing
    - Business logic validation in command handlers
    - apply() method for event emission
    - @event_sourcing_handler for state updates only
    """
    
    def __init__(self):
        super().__init__()
        self.task_id: Optional[str] = None
        self.title: Optional[str] = None
        self.description: Optional[str] = None
        self.completed: bool = False
        self.deleted: bool = False
        self.created_at: Optional[str] = None
        self.completed_at: Optional[str] = None
        
    # =============================================================================
    # COMMAND HANDLERS - Business logic and validation
    # =============================================================================
    
    @command_handler('CreateTaskCommand')
    def create_task(self, command: CreateTaskCommand) -> None:
        """Handle CreateTask command
        
        Business Rules:
        - Task ID must be provided
        - Task must not already exist
        - Title is required
        
        Args:
            command: CreateTaskCommand with task details
            
        Raises:
            ValueError: If validation fails
        """
        # Validation - business rules
        if not command.id:
            raise ValueError('Task ID is required')
            
        if self.task_id is not None:
            raise ValueError(f'Task {command.id} already exists')
            
        if not hasattr(command, 'title') or not command.title:
            raise ValueError('Task title is required')
        
        if hasattr(command, 'title') and command.title.strip() == '':
            raise ValueError('Task title cannot be empty')
        
        # Initialize aggregate with ID
        self._initialize(command.id)
        
        # Apply event (triggers event handler)
        event = TaskCreatedEvent(
            event_type='TaskCreated',
            id=command.id,
        )
        
        # Copy optional fields if present
        if hasattr(command, 'title'):
            event.title = command.title
        if hasattr(command, 'description'):
            event.description = command.description
        if hasattr(command, 'due_date'):
            event.due_date = command.due_date
            
        self._apply(event)
    
    @command_handler('CompleteTaskCommand')
    def complete_task(self, command: CompleteTaskCommand) -> None:
        """Handle CompleteTask command
        
        Business Rules:
        - Task must exist
        - Task must not already be completed
        - Task must not be deleted
        
        Args:
            command: CompleteTaskCommand with task ID
            
        Raises:
            ValueError: If validation fails
        """
        # Validation - business rules
        if self.task_id is None:
            raise ValueError('Cannot complete a task that does not exist')
            
        if self.completed:
            raise ValueError(f'Task {command.id} is already completed')
            
        if self.deleted:
            raise ValueError(f'Cannot complete deleted task {command.id}')
        
        # Apply event
        event = CompleteTaskEvent(
            event_type='TaskCompleted',
            id=command.id,
        )
        self._apply(event)
    
    @command_handler('DeleteTaskCommand')
    def delete_task(self, command: DeleteTaskCommand) -> None:
        """Handle DeleteTask command
        
        Business Rules:
        - Task must exist
        - Task must not already be deleted
        
        Args:
            command: DeleteTaskCommand with task ID
            
        Raises:
            ValueError: If validation fails
        """
        # Validation - business rules
        if self.task_id is None:
            raise ValueError('Cannot delete a task that does not exist')
            
        if self.deleted:
            raise ValueError(f'Task {command.id} is already deleted')
        
        # Apply event
        event = TaskDeletedEvent(
            event_type='TaskDeleted',
            id=command.id,
        )
        self._apply(event)
    
    # =============================================================================
    # EVENT SOURCING HANDLERS - State updates only (NO validation, NO business logic)
    # =============================================================================
    
    @event_sourcing_handler('TaskCreated')
    def _on_task_created(self, event: TaskCreatedEvent) -> None:
        """Apply TaskCreated event - Update state only
        
        NO validation, NO business logic - just state updates
        Event sourcing handlers must be pure and deterministic.
        
        Args:
            event: TaskCreatedEvent containing task details
        """
        self.task_id = event.id
        
        # Set optional fields if present
        if hasattr(event, 'title'):
            self.title = event.title
        if hasattr(event, 'description'):
            self.description = event.description
        if hasattr(event, 'created_at'):
            self.created_at = event.created_at
        if hasattr(event, 'due_date'):
            self.due_date = event.due_date
    
    @event_sourcing_handler('TaskCompleted')
    def _on_task_completed(self, event: CompleteTaskEvent) -> None:
        """Apply TaskCompleted event - Update state only
        
        Args:
            event: CompleteTaskEvent containing completion details
        """
        self.completed = True
        if hasattr(event, 'completed_at'):
            self.completed_at = event.completed_at
    
    @event_sourcing_handler('TaskDeleted')
    def _on_task_deleted(self, event: TaskDeletedEvent) -> None:
        """Apply TaskDeleted event - Update state only
        
        Args:
            event: TaskDeletedEvent
        """
        self.deleted = True
    
    # =============================================================================
    # HELPER METHODS
    # =============================================================================
    
    def get_aggregate_type(self) -> str:
        """Get the aggregate type name"""
        return 'Task'
    
    def get_task_id(self) -> Optional[str]:
        """Get the task ID"""
        return self.task_id
    
    def is_completed(self) -> bool:
        """Check if task is completed"""
        return self.completed
    
    def is_deleted(self) -> bool:
        """Check if task is deleted"""
        return self.deleted

