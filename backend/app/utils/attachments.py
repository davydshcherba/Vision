"""File logic: limits, batch uploads, renaming, deletion."""

from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.i18n import t
from ..models.attachment import Attachment
from ..models.task import Task
from ..schemas.attachment import Limits, UploadError, UploadResult
from .storage import delete_file, safe_filename, save_upload


def current_limits() -> Limits:
    return Limits(
        max_upload_size=settings.max_upload_size,
        max_files_per_task=settings.max_files_per_task,
        max_task_storage=settings.max_task_storage,
        text_preview_limit=settings.text_preview_limit,
    )


async def get_attachment(session: AsyncSession, attachment_id: int) -> Attachment:
    attachment = await session.get(Attachment, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=404, detail=t("file_not_found"))
    return attachment


def file_path(attachment: Attachment) -> Path:
    """Path to the file on disk; 404 if the DB row exists but the file is gone."""
    path = settings.upload_path / attachment.stored_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail=t("file_missing_on_disk"))
    return path


async def save_uploads(
    session: AsyncSession, task: Task, files: list[UploadFile]
) -> UploadResult:
    """Saves a batch of files.

    One bad file doesn't break the rest: it goes to `failed` with a reason,
    and the others are saved. If none succeeded, raise 400 with the list of
    reasons. Any error after writing to disk cleans up the written files,
    otherwise they would be left dangling without a DB row.
    """
    used_slots = len(task.attachments)
    used_bytes = sum(attachment.size for attachment in task.attachments)

    uploaded: list[Attachment] = []
    failed: list[UploadError] = []
    stored_names: list[str] = []

    try:
        for upload in files:
            name = safe_filename(upload.filename)

            if used_slots + len(uploaded) >= settings.max_files_per_task:
                failed.append(
                    UploadError(
                        filename=name,
                        error=t("file_limit_reached", limit=settings.max_files_per_task),
                    )
                )
                continue

            try:
                stored_name, size = await save_upload(
                    upload, settings.upload_path, settings.max_upload_size
                )
            except HTTPException as exc:
                failed.append(UploadError(filename=name, error=str(exc.detail)))
                continue

            if used_bytes + size > settings.max_task_storage:
                delete_file(settings.upload_path, stored_name)
                limit_mb = settings.max_task_storage // (1024 * 1024)
                failed.append(
                    UploadError(
                        filename=name,
                        error=t("task_storage_exceeded", limit_mb=limit_mb),
                    )
                )
                continue

            used_bytes += size
            stored_names.append(stored_name)

            attachment = Attachment(
                task_id=task.id,
                filename=name,
                stored_name=stored_name,
                content_type=upload.content_type,
                size=size,
            )
            session.add(attachment)
            uploaded.append(attachment)

        if not uploaded:
            detail = "; ".join(f"{f.filename}: {f.error}" for f in failed)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail or t("nothing_uploaded"),
            )

        await session.commit()
    except Exception:
        await session.rollback()
        for stored_name in stored_names:
            delete_file(settings.upload_path, stored_name)
        raise

    for attachment in uploaded:
        await session.refresh(attachment)

    return UploadResult(uploaded=uploaded, failed=failed)


async def rename_attachment(
    session: AsyncSession, attachment: Attachment, filename: str
) -> Attachment:
    """Renames a file. Nothing moves on disk — the name there is internal."""
    name = safe_filename(filename)
    if not name:
        raise HTTPException(status_code=422, detail=t("empty_filename"))

    attachment.filename = name
    await session.commit()
    await session.refresh(attachment)
    return attachment


async def delete_attachment(session: AsyncSession, attachment: Attachment) -> None:
    stored_name = attachment.stored_name

    await session.delete(attachment)
    await session.commit()

    delete_file(settings.upload_path, stored_name)
