from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from ..files.preview import PreviewKind, preview_kind


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: str | None = None
    size: int
    created_at: datetime

    @computed_field
    @property
    def download_url(self) -> str:
        return f"/api/attachments/{self.id}/download"

    @computed_field
    @property
    def view_url(self) -> str:
        """Той самий файл, але для перегляду прямо в сторінці."""
        return f"/api/attachments/{self.id}/view"

    @computed_field
    @property
    def preview(self) -> PreviewKind | None:
        """Як фронтенд має показати файл. None — тільки завантаження."""
        return preview_kind(self.content_type, self.filename)


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
