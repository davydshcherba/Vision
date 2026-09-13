"""Task logic: querying, updating, counters, deletion together with files."""

from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..models.task import Task, TaskStatus
from ..schemas.task import Stats, TaskCreate, TaskUpdate
from .storage import delete_file


async def list_tasks(
    session: AsyncSession,
    *,
    status: TaskStatus | None = None,
    query: str | None = None,
) -> list[Task]:
    stmt = select(Task)

    if status is not None:
        stmt = stmt.where(Task.status == status)

    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))

    # * Nearest deadlines first, undated tasks at the end
    stmt = stmt.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())

    result = await session.execute(stmt)
    return list(result.scalars().unique().all())


async def get_task(session: AsyncSession, task_id: int) -> Task:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Задачу не знайдено")
    return task


async def create_task(session: AsyncSession, payload: TaskCreate) -> Task:
    task = Task(**payload.model_dump())
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def update_task(session: AsyncSession, task: Task, payload: TaskUpdate) -> Task:
    # * exclude_unset: update only what was actually sent
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    await session.commit()
    await session.refresh(task)
    return task


async def delete_task(session: AsyncSession, task: Task) -> None:
    """Deletes a task together with its files — both from the DB and from disk."""
    stored_names = [attachment.stored_name for attachment in task.attachments]

    await session.delete(task)
    await session.commit()

    for stored_name in stored_names:
        delete_file(settings.upload_path, stored_name)


async def collect_stats(session: AsyncSession) -> Stats:
    by_status = await session.execute(select(Task.status, func.count()).group_by(Task.status))
    counts = {row[0]: row[1] for row in by_status.all()}

    overdue = await session.execute(
        select(func.count())
        .select_from(Task)
        .where(
            Task.due_date.is_not(None),
            Task.due_date < date.today(),
            Task.status != TaskStatus.done,
        )
    )

    return Stats(
        total=sum(counts.values()),
        todo=counts.get(TaskStatus.todo, 0),
        in_progress=counts.get(TaskStatus.in_progress, 0),
        done=counts.get(TaskStatus.done, 0),
        overdue=overdue.scalar_one(),
    )
