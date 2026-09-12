"""Наповнює тестову базу прикладами задач.

Запуск: docker compose exec backend python seed.py
"""

import asyncio
from datetime import date, timedelta

from sqlalchemy import delete, select, func

from app.database import Base, SessionLocal, engine
from app.models import Attachment, Task, TaskStatus

TODAY = date.today()

DEMO_TASKS = [
    {
        "title": "Лабораторна №3 з баз даних",
        "description": "Спроєктувати схему БД для бібліотеки, написати 10 SQL-запитів і здати звіт.",
        "due_date": TODAY - timedelta(days=2),
        "status": TaskStatus.in_progress,
    },
    {
        "title": "Курсова: розділ 2",
        "description": "Огляд літератури, мінімум 15 джерел, оформлення за ДСТУ 8302:2015.",
        "due_date": TODAY + timedelta(days=5),
        "status": TaskStatus.todo,
    },
    {
        "title": "Підготуватись до колоквіуму з матаналізу",
        "description": "Границі, похідні, інтеграли. Прорішати варіанти минулих років.",
        "due_date": TODAY + timedelta(days=1),
        "status": TaskStatus.todo,
    },
    {
        "title": "Презентація з англійської",
        "description": "Тема: Artificial Intelligence in Education. 7 хвилин, 10 слайдів.",
        "due_date": TODAY + timedelta(days=12),
        "status": TaskStatus.todo,
    },
    {
        "title": "Здати реферат з філософії",
        "description": "Тема обрана, текст написаний, здано на перевірку.",
        "due_date": TODAY - timedelta(days=7),
        "status": TaskStatus.done,
    },
]


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        existing = await session.execute(select(func.count()).select_from(Task))
        if existing.scalar_one() > 0:
            print("У базі вже є задачі — очищаю перед наповненням...")
            await session.execute(delete(Attachment))
            await session.execute(delete(Task))
            await session.commit()

        session.add_all([Task(**data) for data in DEMO_TASKS])
        await session.commit()

    print(f"Готово: додано {len(DEMO_TASKS)} тестових задач.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
