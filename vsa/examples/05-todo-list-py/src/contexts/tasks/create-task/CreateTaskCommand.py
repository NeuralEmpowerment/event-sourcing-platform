"""Command to create-task"""

from pydantic import BaseModel


class CreateTaskCommand(BaseModel):
    """Command to create-task"""

    id: str
