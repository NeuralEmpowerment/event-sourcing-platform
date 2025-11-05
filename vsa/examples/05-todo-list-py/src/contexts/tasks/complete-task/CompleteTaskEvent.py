"""Event representing complete-task completion"""

from event_sourcing import DomainEvent

class CompleteTaskEvent(DomainEvent):
    """Event representing complete-task completion"""

    event_type: str = "CompleteTaskEvent"
    id: str
