from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_session
from ..models import Attachment
from ..preview import inline_media_type
from ..schemas import AttachmentRead, AttachmentUpdate
from ..storage import delete_file, safe_filename

router = APIRouter(prefix="/api/attachments", tags=["attachments"])


async def _get_attachment_or_404(session: AsyncSession, attachment_id: int) -> Attachment:
    attachment = await session.get(Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    return attachment


@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: int, session: AsyncSession = Depends(get_session)
) -> FileResponse:
    attachment = await _get_attachment_or_404(session, attachment_id)
    path = settings.upload_path / attachment.stored_name

    if not path.is_file():
        raise HTTPException(status_code=404, detail="Файл відсутній на диску")

    return FileResponse(
        path,
        filename=attachment.filename,
        media_type=attachment.content_type or "application/octet-stream",
    )


@router.get("/{attachment_id}/view")
async def view_attachment(
    attachment_id: int, session: AsyncSession = Depends(get_session)
) -> FileResponse:
    """Віддає файл для перегляду в браузері (Content-Disposition: inline).

    PDF відкривається у вбудованому переглядачі й гортається, картинки
    показуються як є. Для решти типів інлайн не дозволяємо — такий файл
    віддається як завантаження.
    """
    attachment = await _get_attachment_or_404(session, attachment_id)
    path = settings.upload_path / attachment.stored_name

    if not path.is_file():
        raise HTTPException(status_code=404, detail="Файл відсутній на диску")

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


@router.patch("/{attachment_id}", response_model=AttachmentRead)
async def rename_attachment(
    attachment_id: int,
    payload: AttachmentUpdate,
    session: AsyncSession = Depends(get_session),
) -> Attachment:
    """Перейменовує файл. На диску нічого не рухаємо — там ім'я службове."""
    attachment = await _get_attachment_or_404(session, attachment_id)

    name = safe_filename(payload.filename)
    if not name:
        raise HTTPException(status_code=422, detail="Порожня назва файлу")

    attachment.filename = name
    await session.commit()
    await session.refresh(attachment)
    return attachment


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: int, session: AsyncSession = Depends(get_session)
) -> None:
    attachment = await _get_attachment_or_404(session, attachment_id)
    stored_name = attachment.stored_name

    await session.delete(attachment)
    await session.commit()

    delete_file(settings.upload_path, stored_name)
