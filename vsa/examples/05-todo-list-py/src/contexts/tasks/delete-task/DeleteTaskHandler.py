"""Handler for DeleteTaskCommand"""

from .DeleteTaskCommand import DeleteTaskCommand
from .TaskDeletedEvent import TaskDeletedEvent
from event_sourcing import Repository

class DeleteTaskHandler:
    """Handler for DeleteTaskCommand

    This handler processes the command, applies business logic,
    creates events, and persists them to the event store.
    """

    def __init__(self, repository: Repository):
        self.repository = repository

    async def handle(self, command: DeleteTaskCommand) -> None:
        """Process the command and emit events"""
        # TODO: Add validation logic

        # Create event
        event = TaskDeletedEvent(
            id=command.id,
        )

        # TODO: Persist to event store
        # await self.event_store.append(stream_name, [event])
