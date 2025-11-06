"""Event representing delete-task completion"""

from typing import Optional
from event_sourcing import DomainEvent

class TaskDeletedEvent(DomainEvent):
    """Event representing task deletion
    
    Attributes:
        event_type: The event type identifier
        id: The task ID
        deleted_at: When the task was deleted
    """

    event_type: str = "TaskDeleted"
    id: str
    deleted_at: Optional[str] = None
