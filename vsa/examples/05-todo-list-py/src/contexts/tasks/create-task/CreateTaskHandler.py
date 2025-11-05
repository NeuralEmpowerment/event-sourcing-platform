"""Handler for CreateTaskCommand"""

from .CreateTaskCommand import CreateTaskCommand
from .TaskCreatedEvent import TaskCreatedEvent
from event_sourcing import Repository

class CreateTaskHandler:
    """Handler for CreateTaskCommand

    This handler processes the command, applies business logic,
    creates events, and persists them to the event store.
    """

    def __init__(self, repository: Repository):
        self.repository = repository

    async def handle(self, command: CreateTaskCommand) -> None:
        """Process the command and emit events"""
        # TODO: Add validation logic

        # Create event
        event = TaskCreatedEvent(
            id=command.id,
        )

        # TODO: Persist to event store
        # await self.event_store.append(stream_name, [event])
