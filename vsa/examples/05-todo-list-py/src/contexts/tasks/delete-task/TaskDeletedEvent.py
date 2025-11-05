"""Event representing delete-task completion"""

from event_sourcing import DomainEvent

class TaskDeletedEvent(DomainEvent):
    """Event representing delete-task completion"""

    event_type: str = "TaskDeletedEvent"
    id: str
