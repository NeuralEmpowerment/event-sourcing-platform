"""Event store client interfaces and implementations."""

from event_sourcing.client.event_store import EventStoreClient, EventStoreClientFactory
from event_sourcing.client.memory import MemoryEventStoreClient

__all__ = [
    "EventStoreClient",
    "EventStoreClientFactory",
    "MemoryEventStoreClient",
]

