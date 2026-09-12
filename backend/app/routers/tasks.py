from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_session
from ..models import Attachment, Task, TaskStatus
from ..schemas import (
    Limits,
    Stats,
    TaskCreate,
    TaskRead,
    TaskUpdate,
    UploadError,
    UploadResult,
)
from ..storage import delete_file, safe_filename, save_upload

router = APIRouter(prefix="/api", tags=["tasks"])


async def _get_task_or_404(session: AsyncSession, task_id: int) -> Task:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задачу не знайдено")
    return task


@router.get("/tasks", response_model=list[TaskRead])
async def list_tasks(
    session: AsyncSession = Depends(get_session),
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, description="Пошук за назвою та описом"),
) -> list[Task]:
    stmt = select(Task)

    if status_filter is not None:
        stmt = stmt.where(Task.status == status_filter)

    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))

    # Спочатку найближчі дедлайни, задачі без дати — в кінці
    stmt = stmt.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())

    result = await session.execute(stmt)
    return list(result.scalars().unique().all())


@router.get("/stats", response_model=Stats, tags=["stats"])
async def get_stats(session: AsyncSession = Depends(get_session)) -> Stats:
    by_status = await session.execute(select(Task.status, func.count()).group_by(Task.status))
    counts = {row[0]: row[1] for row in by_status.all()}

    overdue = await session.execute(
        select(func.count())
        .select_from(Task)
        .where(Task.due_date.is_not(None), Task.due_date < date.today(), Task.status != TaskStatus.done)
    )

    return Stats(
        total=sum(counts.values()),
        todo=counts.get(TaskStatus.todo, 0),
        in_progress=counts.get(TaskStatus.in_progress, 0),
        done=counts.get(TaskStatus.done, 0),
        overdue=overdue.scalar_one(),
    )


@router.get("/limits", response_model=Limits, tags=["service"])
async def get_limits() -> Limits:
    """Ліміти сервера, щоб фронтенд не відправляв завідомо завеликі файли."""
    return Limits(
        max_upload_size=settings.max_upload_size,
        max_files_per_task=settings.max_files_per_task,
        max_task_storage=settings.max_task_storage,
        text_preview_limit=settings.text_preview_limit,
    )


@router.get("/tasks/{task_id}", response_model=TaskRead)
async def get_task(task_id: int, session: AsyncSession = Depends(get_session)) -> Task:
    return await _get_task_or_404(session, task_id)


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, session: AsyncSession = Depends(get_session)) -> Task:
    task = Task(**payload.model_dump())
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int, payload: TaskUpdate, session: AsyncSession = Depends(get_session)
) -> Task:
    task = await _get_task_or_404(session, task_id)

    # exclude_unset: оновлюємо тільки те, що реально прислали
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    await session.commit()
    await session.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, session: AsyncSession = Depends(get_session)) -> None:
    task = await _get_task_or_404(session, task_id)
    stored_names = [a.stored_name for a in task.attachments]

    await session.delete(task)
    await session.commit()

    for name in stored_names:
        (settings.upload_path / name).unlink(missing_ok=True)


@router.post(
    "/tasks/{task_id}/attachments",
    response_model=UploadResult,
    status_code=status.HTTP_201_CREATED,
    tags=["attachments"],
)
async def upload_attachments(
    task_id: int,
    files: list[UploadFile] = File(..., description="Один або кілька файлів"),
    session: AsyncSession = Depends(get_session),
) -> UploadResult:
    """Зберігає пачку файлів.

    Один проблемний файл не валить решту: він потрапляє у `failed` з причиною,
    а решта зберігається. Якщо не вдалося жодного — повертаємо 400 зі списком
    причин. Будь-яка помилка після запису на диск прибирає за собою файли,
    інакше вони залишились би висіти без запису в базі.
    """
    task = await _get_task_or_404(session, task_id)

    used_slots = len(task.attachments)
    used_bytes = sum(a.size for a in task.attachments)

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
                        error=f"Ліміт {settings.max_files_per_task} файлів на задачу вичерпано",
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
                        error=f"Перевищено сумарний ліміт задачі ({limit_mb} МБ)",
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
                detail=detail or "Не вдалося завантажити жодного файлу",
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
