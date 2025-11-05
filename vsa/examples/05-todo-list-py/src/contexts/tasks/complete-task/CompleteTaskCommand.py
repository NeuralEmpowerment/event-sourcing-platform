"""Command to complete-task"""

from pydantic import BaseModel


class CompleteTaskCommand(BaseModel):
    """Command to complete-task"""

    id: str
