from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_session
from . import service
from .models import Task, TaskStatus
from .schemas import Stats, TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/api", tags=["tasks"])


@router.get("/tasks", response_model=list[TaskRead])
async def list_tasks(
    session: AsyncSession = Depends(get_session),
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, description="Пошук за назвою та описом"),
) -> list[Task]:
    return await service.list_tasks(session, status=status_filter, query=q)


@router.get("/stats", response_model=Stats, tags=["stats"])
async def get_stats(session: AsyncSession = Depends(get_session)) -> Stats:
    return await service.collect_stats(session)


@router.get("/tasks/{task_id}", response_model=TaskRead)
async def get_task(task_id: int, session: AsyncSession = Depends(get_session)) -> Task:
    return await service.get_task(session, task_id)


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, session: AsyncSession = Depends(get_session)) -> Task:
    return await service.create_task(session, payload)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int, payload: TaskUpdate, session: AsyncSession = Depends(get_session)
) -> Task:
    task = await service.get_task(session, task_id)
    return await service.update_task(session, task, payload)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, session: AsyncSession = Depends(get_session)) -> None:
    task = await service.get_task(session, task_id)
    await service.delete_task(session, task)
