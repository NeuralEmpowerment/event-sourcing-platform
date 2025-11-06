"""Command to create-task"""

from typing import Optional
from pydantic import BaseModel


class CreateTaskCommand(BaseModel):
    """Command to create a new task
    
    Attributes:
        id: The task ID (aggregate_id)
        title: The task title (required)
        description: Optional task description
        due_date: Optional due date for the task
    """

    id: str  # aggregate_id
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
