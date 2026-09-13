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
        """The same file, but for viewing right in the page."""
        return f"/api/attachments/{self.id}/view"

    @computed_field
    @property
    def preview(self) -> PreviewKind | None:
        """How the frontend should show the file. None means download only."""
        return preview_kind(self.content_type, self.filename)


class AttachmentUpdate(BaseModel):
    filename: str = Field(min_length=1, max_length=255)


class UploadError(BaseModel):
    """A file from the batch that could not be saved."""

    filename: str
    error: str


class UploadResult(BaseModel):
    """A batch is uploaded partially: whatever succeeds is saved."""

    uploaded: list[AttachmentRead] = []
    failed: list[UploadError] = []


class Limits(BaseModel):
    """Server limits — the frontend checks files before sending them."""

    max_upload_size: int
    max_files_per_task: int
    max_task_storage: int
    text_preview_limit: int
