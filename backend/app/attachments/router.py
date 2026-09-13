from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_session
from ..files.preview import inline_media_type
from ..tasks import service as tasks_service
from . import service
from .models import Attachment
from .schemas import AttachmentRead, AttachmentUpdate, Limits, UploadResult

router = APIRouter(prefix="/api", tags=["attachments"])


@router.get("/limits", response_model=Limits, tags=["service"])
async def get_limits() -> Limits:
    """Server limits, so the frontend doesn't send files that are known to be too large."""
    return service.current_limits()


@router.post(
    "/tasks/{task_id}/attachments",
    response_model=UploadResult,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachments(
    task_id: int,
    files: list[UploadFile] = File(..., description="Один або кілька файлів"),
    session: AsyncSession = Depends(get_session),
) -> UploadResult:
    task = await tasks_service.get_task(session, task_id)
    return await service.save_uploads(session, task, files)


@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: int, session: AsyncSession = Depends(get_session)
) -> FileResponse:
    attachment = await service.get_attachment(session, attachment_id)

    return FileResponse(
        service.file_path(attachment),
        filename=attachment.filename,
        media_type=attachment.content_type or "application/octet-stream",
    )


@router.get("/attachments/{attachment_id}/view")
async def view_attachment(
    attachment_id: int, session: AsyncSession = Depends(get_session)
) -> FileResponse:
    """Serves a file for viewing in the browser (Content-Disposition: inline).

    PDFs open in the built-in viewer and can be scrolled, images are shown
    as is. Inline is not allowed for any other type — such a file is
    served as a download.
    """
    attachment = await service.get_attachment(session, attachment_id)
    path = service.file_path(attachment)
    media_type = inline_media_type(attachment.content_type, attachment.filename)

    if media_type is None:
        return FileResponse(
            path,
            filename=attachment.filename,
            media_type=attachment.content_type or "application/octet-stream",
        )

    return FileResponse(
        path,
        filename=attachment.filename,
        media_type=media_type,
        content_disposition_type="inline",
    )


@router.patch("/attachments/{attachment_id}", response_model=AttachmentRead)
async def rename_attachment(
    attachment_id: int,
    payload: AttachmentUpdate,
    session: AsyncSession = Depends(get_session),
) -> Attachment:
    attachment = await service.get_attachment(session, attachment_id)
    return await service.rename_attachment(session, attachment, payload.filename)


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: int, session: AsyncSession = Depends(get_session)
) -> None:
    attachment = await service.get_attachment(session, attachment_id)
    await service.delete_attachment(session, attachment)
