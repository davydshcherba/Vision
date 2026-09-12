from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from .models import TaskStatus
from .preview import preview_kind


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: str | None = None
    size: int
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def download_url(self) -> str:
        return f"/api/attachments/{self.id}/download"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def view_url(self) -> str:
        """Той самий файл, але для перегляду прямо в сторінці."""
        return f"/api/attachments/{self.id}/view"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def preview(self) -> Literal["pdf", "image", "text"] | None:
        """Як фронтенд має показати файл. None — тільки завантаження."""
        return preview_kind(self.content_type, self.filename)  # type: ignore[return-value]


class AttachmentUpdate(BaseModel):
    filename: str = Field(min_length=1, max_length=255)


class UploadError(BaseModel):
    """Файл із пачки, який не вдалося зберегти."""

    filename: str
    error: str


class UploadResult(BaseModel):
    """Пачка завантажується частинами: що вдалось — зберігається."""

    uploaded: list[AttachmentRead] = []
    failed: list[UploadError] = []


class Limits(BaseModel):
    """Обмеження сервера — фронтенд перевіряє файли ще до відправки."""

    max_upload_size: int
    max_files_per_task: int
    max_task_storage: int
    text_preview_limit: int


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
