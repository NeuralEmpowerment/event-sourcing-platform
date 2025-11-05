"""Command to delete-task"""

from pydantic import BaseModel


class DeleteTaskCommand(BaseModel):
    """Command to delete-task"""

    id: str
