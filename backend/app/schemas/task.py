from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from ..models.task import TaskStatus
from .attachment import AttachmentRead


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    due_date: date | None = None
    status: TaskStatus = TaskStatus.todo


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    due_date: date | None = None
    status: TaskStatus | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentRead] = []


class Stats(BaseModel):
    total: int = 0
    todo: int = 0
    in_progress: int = 0
    done: int = 0
    overdue: int = 0
