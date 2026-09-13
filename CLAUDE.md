# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A student task dashboard: tasks (title, description, due date, status) with file attachments and in-page file preview. FastAPI + async SQLAlchemy + PostgreSQL backend, Next.js 15 (App Router, TypeScript, React 19) frontend, all run with Docker Compose. The README and code comments are in English; UI strings and API error messages are in Ukrainian — keep new ones that way. Comments use [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments) tags: `! ` for pitfalls and security notes, `* ` for important rationale, `? ` for open questions, `TODO` for pending work; plain comments otherwise. Docstrings and JSDoc stay untagged.

## Commands

The whole stack runs in Docker (`docker compose up --build`, or `make up`): frontend :3000, API :8000 (Swagger at `/docs`), Adminer :8080, Postgres :5432 (user/password `vision`, db `vision_tasks`). The backend container runs `alembic upgrade head` on start and uvicorn with `--reload`; both `backend/` and `frontend/` are bind-mounted, so code changes hot-reload.

Backend tests (need a running Postgres):
```bash
make test                                             # docker compose exec backend pytest
docker compose exec backend pytest tests/test_tasks.py::test_create_and_read_task   # single test
cd backend && uv run pytest -k upload                 # without Docker
```

Migrations (Alembic, autogenerate):
```bash
make migration m="description"   # alembic revision --autogenerate
make migrate                     # alembic upgrade head
```

Dependencies: backend uses **uv** (`uv add <pkg>`, `uv add --dev <pkg>`; after hand-editing `pyproject.toml` run `make lock`), frontend uses **bun** (`bun add <pkg>`). After changing deps, rebuild the image: `docker compose build backend|frontend`.

Without Docker: `cd backend && uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --reload`; `cd frontend && bun install && bun run dev`. Settings defaults already point at `localhost:5432` and `backend/uploads`.

There is no linter or formatter configured. Frontend type check: `cd frontend && bunx tsc --noEmit`.

## Backend architecture (`backend/app/`)

One package per domain (`tasks/`, `attachments/`), each split into `router.py` (HTTP only: parse request, shape response), `service.py` (all logic, raises `HTTPException`), `models.py`, `schemas.py`. Shared code lives in `core/` (pydantic-settings `config.py`, async engine and `get_session` dependency in `database.py`) and `files/` (disk storage and inline-preview rules).

- **Import direction is one-way**: `attachments` imports from `tasks`; the `Task.attachments` relationship (`lazy="selectin"`, `cascade="all, delete-orphan"`) is declared only in `tasks/models.py`. Don't import `tasks` from `attachments/models.py` or you'll create a cycle.
- New models must be imported in `migrations/env.py` so autogenerate sees them.
- **Files on disk vs DB**: files are stored under `settings.upload_path` with a uuid `stored_name`; `filename` in the DB is only the display name (renaming never touches disk). Any code path that deletes or fails to commit rows must also clean up files on disk — see `save_uploads` (rollback removes already-written files) and `delete_task` (collects `stored_name`s before deleting). Tests assert no orphaned files remain.
- **Batch uploads are partial**: `POST /api/tasks/{id}/attachments` returns `{uploaded, failed}`; one bad file (size, per-task count/storage limit, empty) goes to `failed` without blocking others; 400 only if nothing was saved. Limits come from env (`MAX_UPLOAD_SIZE`, `MAX_FILES_PER_TASK`, `MAX_TASK_STORAGE`, `TEXT_PREVIEW_LIMIT`) and are exposed via `GET /api/limits` for the frontend.
- **Preview security** (`files/preview.py` is the single source of truth for both the `preview` schema field and the `/view` route): only PDFs and raster images are served inline with their real type; all text (including `.html`) is served as `text/plain`; SVG and everything else is download-only. Never serve the client-supplied content type inline.

## Tests (`backend/tests/`)

`conftest.py` drops and recreates a separate `vision_tasks_test` database once per session (derived from `DATABASE_URL`), recreates tables via `Base.metadata.create_all` per test (not via migrations), overrides `get_session`, and monkeypatches `settings.upload_dir` to a tmp dir. Tests use an `httpx.AsyncClient` over ASGI; `asyncio_mode = "auto"`, so no `@pytest.mark.asyncio` needed. Fixtures `client`, `task`, `uploads`, plus `PDF_BYTES`/`PNG_BYTES`/`upload_file()` helpers.

## Frontend architecture (`frontend/`)

A single client-rendered page (`app/page.tsx`) holds all state (tasks, stats, limits, filter, debounced search, open task/file) and refetches tasks + stats after every mutation. Components: `TaskBoard` (three kanban columns, drag & drop or arrow buttons to change status), `TaskDetail` (modal with `FilePreview`), `TaskForm`, `FileDropzone`, `UploadProgress`.

- `lib/api.ts` is the only API client (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000`). Uploads use `XMLHttpRequest` rather than `fetch` to get upload progress. Text previews are fetched with a `Range` header up to `text_preview_limit` and decoded as UTF-8 with a windows-1251 fallback.
- `lib/types.ts` mirrors the backend Pydantic schemas by hand — update both sides together. `lib/files.ts` checks file sizes client-side before upload using the server limits.
- Import alias `@/` maps to the `frontend/` root.

## Commits

Conventional Commits with a scope, as in the git history: `feat(web): ...`, `refactor(api): ...`, `chore(db): ...`, `test(api): ...`, `docs: ...`. Imperative mood, lowercase after the colon, no trailing period, header ≤72 chars, one logical change per commit.
