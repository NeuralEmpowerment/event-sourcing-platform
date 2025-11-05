"""Event representing create-task completion"""

from event_sourcing import DomainEvent

class TaskCreatedEvent(DomainEvent):
    """Event representing create-task completion"""

    event_type: str = "TaskCreatedEvent"
    id: str
