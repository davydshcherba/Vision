from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import engine
from .core.i18n import current_lang, pick_language
from .routers.attachments import router as attachments_router
from .routers.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # * The schema is applied by alembic (see command in docker-compose.yml),
    # * here we only prepare the upload folder.
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

@app.middleware("http")
async def set_language(request: Request, call_next):
    # * Error messages follow the client's Accept-Language (uk by default)
    token = current_lang.set(pick_language(request.headers.get("accept-language")))
    try:
        return await call_next(request)
    finally:
        current_lang.reset(token)


app.include_router(tasks_router)
app.include_router(attachments_router)


@app.get("/health", tags=["service"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
