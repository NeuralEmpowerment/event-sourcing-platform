"""Event representing create-task completion"""

from typing import Optional
from event_sourcing import DomainEvent

class TaskCreatedEvent(DomainEvent):
    """Event representing task creation
    
    Attributes:
        event_type: The event type identifier
        id: The task ID
        title: The task title
        description: Optional task description
        due_date: Optional due date
        created_at: When the task was created
    """

    event_type: str = "TaskCreated"
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    created_at: Optional[str] = None
