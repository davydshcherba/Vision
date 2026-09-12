from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .attachments.router import router as attachments_router
from .core.config import settings
from .core.database import engine
from .tasks.router import router as tasks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Схему накатує alembic (див. command у docker-compose.yml),
    # тут лише готуємо теку для файлів.
    settings.upload_path.mkdir(parents=True, exist_ok=True)
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

app.include_router(tasks_router)
app.include_router(attachments_router)


@app.get("/health", tags=["service"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
