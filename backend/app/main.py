import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import models  # noqa: F401  — реєструє таблиці у метаданих
from .config import settings
from .database import engine
from .routers import attachments, tasks

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("vision")


async def wait_for_db(retries: int = 30, delay: float = 2.0) -> None:
    """Postgres у docker-compose може ще підніматись — чекаємо на нього."""
    for attempt in range(1, retries + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("База даних доступна")
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning("База ще не готова (%s/%s): %s", attempt, retries, exc)
            await asyncio.sleep(delay)

    raise RuntimeError("Не вдалося підключитися до бази даних")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Схему накатує alembic (див. command у docker-compose.yml),
    # тут лише чекаємо на базу й готуємо теку для файлів.
    await wait_for_db()
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    logger.info("Застосунок готовий")
    yield
    await engine.dispose()


app = FastAPI(
    title="Дашборд задач студента",
    version="1.0.0",
    description="API для задач: назва, опис, дата виконання, статус і файли.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(attachments.router)


@app.get("/health", tags=["service"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
