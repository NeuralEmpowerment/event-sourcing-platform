"""Event representing complete-task completion"""

from typing import Optional
from event_sourcing import DomainEvent

class CompleteTaskEvent(DomainEvent):
    """Event representing task completion
    
    Attributes:
        event_type: The event type identifier
        id: The task ID
        completed_at: When the task was completed
    """

    event_type: str = "TaskCompleted"
    id: str
    completed_at: Optional[str] = None
