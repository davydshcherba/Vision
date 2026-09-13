"""Shared fixtures.

Tests run against a separate `vision_tasks_test` database next to the working one,
and files are written to a pytest temp folder — working data is never touched.
"""

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_session
from app.main import app

TEST_DB = "vision_tasks_test"


def _url_for(database: str) -> str:
    return settings.database_url.rsplit("/", 1)[0] + f"/{database}"


async def _recreate_database() -> None:
    admin = create_async_engine(_url_for("postgres"), isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        await conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB}" WITH (FORCE)'))
        await conn.execute(text(f'CREATE DATABASE "{TEST_DB}"'))
    await admin.dispose()


@pytest.fixture(scope="session")
def database_url() -> str:
    """A clean test database — created once per pytest run."""
    asyncio.run(_recreate_database())
    return _url_for(TEST_DB)


@pytest_asyncio.fixture
async def engine(database_url) -> AsyncGenerator[AsyncEngine, None]:
    test_engine = create_async_engine(database_url)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield test_engine
    await test_engine.dispose()


@pytest_asyncio.fixture
async def uploads(tmp_path, monkeypatch):
    """Upload folder for the duration of a single test."""
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr(settings, "upload_dir", str(upload_dir))
    return upload_dir


@pytest_asyncio.fixture
async def client(engine, uploads) -> AsyncGenerator[AsyncClient, None]:
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def task(client) -> dict:
    response = await client.post("/api/tasks", json={"title": "Тестова задача"})
    assert response.status_code == 201
    return response.json()


PDF_BYTES = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc```\x00\x00"
    b"\x00\x04\x00\x01\xf6\x178U\x00\x00\x00\x00IEND\xaeB`\x82"
)


def upload_file(name: str, data: bytes, content_type: str):
    """A single item for a multipart request."""
    return ("files", (name, data, content_type))
