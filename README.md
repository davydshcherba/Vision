<div align="center">

<img src="img/logo_banner.png" alt="Vision — todo tasker" width="220">

# Vision — Student Task Dashboard

A tracker for study assignments: title, description, due date, status and attached files —
with in-page preview for PDFs, images and text, a kanban board and a UA / EN interface.

[![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

[Quick start](#quick-start) · [Features](#features) · [API](#api) · [Configuration](#configuration) · [Structure](#project-structure) · [Development](#development)

</div>

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic v2 |
| Database | PostgreSQL 16 |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Infrastructure | Docker Compose, Adminer |
| Package managers | [uv](https://docs.astral.sh/uv/) (backend), [bun](https://bun.sh/) (frontend) |

---

## Quick start

Only Docker is required.

```bash
docker compose up --build     # or: make up
```

The first start takes 2–4 minutes (dependencies are installed). After that:

| Service | Address |
|---|---|
| Dashboard (Next.js) | http://localhost:3000 |
| API (FastAPI) | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |
| Adminer (DB viewer) | http://localhost:8080 |
| Postgres | `localhost:5432` |

Migrations are applied automatically when the backend starts — nothing to do by hand.
Both `backend/` and `frontend/` are bind-mounted, so code changes hot-reload.

### Everyday commands

```bash
docker compose up -d        # in the background        (make up)
docker compose logs -f      # logs                     (make logs)
docker compose exec backend pytest                   # (make test)
docker compose down         # stop                     (make down)
docker compose down -v      # stop and wipe the database + uploaded files (make reset)
```

Run `make` targets from the repository root: `up`, `down`, `restart`, `logs`, `test`,
`migrate`, `migration`, `lock`, `reset`, `ps`, `shell-db`, `shell-api`.

### Database access

Adminer at http://localhost:8080 → system `PostgreSQL`, server `db`, user `vision`,
password `vision`, database `vision_tasks`. Or via psql:

```bash
docker compose exec db psql -U vision -d vision_tasks     # make shell-db
```

---

## Features

**Tasks**

- Create a task with **title**, **description**, **due date** and **status**
- **Three-column board** — To do / In progress / Done. Inside a column tasks are sorted
  by deadline: nearest first, undated ones at the end
- **Drag & drop** a card to another column, or move it with the ← → arrows
- **Task modal**: description, deadline, status, all files and their dates
- Search by title and description, filter by status — leaves a single column
- Counters at the top, including **overdue** deadlines
- Delete a task together with its files (both from disk and from the DB)

**Files**

- Attach files when creating a task or to an existing one (up to 20 MB per file)
- **In-page preview** — PDFs open in the browser's built-in viewer and can be scrolled,
  images are shown as is, text files are rendered in a monospace font. No need to
  download a file just to take a look
- **Upload progress** in percent, so a large PDF no longer hangs silently
- File size is checked **before sending** — an oversized file won't travel over the network for nothing
- One bad file in a batch **doesn't block the rest**: the others are saved, and it shows
  up in a warning with the reason
- Rename and delete files, image thumbnails in the file list

**Interface**

- **UA / EN language switch** in the header — the choice is remembered in `localStorage`,
  and API error messages follow it via the `Accept-Language` header

---

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tasks?status=&q=` | List tasks (status filter, search) |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/{id}` | Get a single task |
| `PATCH` | `/api/tasks/{id}` | Update task fields |
| `DELETE` | `/api/tasks/{id}` | Delete a task with its files |
| `POST` | `/api/tasks/{id}/attachments` | Upload files (multipart, field `files`) |
| `GET` | `/api/attachments/{id}/view` | Show a file in the browser (`Content-Disposition: inline`) |
| `GET` | `/api/attachments/{id}/download` | Download a file |
| `PATCH` | `/api/attachments/{id}` | Rename a file |
| `DELETE` | `/api/attachments/{id}` | Delete a file |
| `GET` | `/api/stats` | Dashboard counters |
| `GET` | `/api/limits` | Server limits (read by the frontend) |
| `GET` | `/health` | Liveness check |

```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Term paper","description":"Chapter 1","due_date":"2026-10-01"}'

curl -X POST http://localhost:8000/api/tasks/1/attachments -F "files=@notes.pdf"
```

An upload reports exactly what was saved and what wasn't:

```json
{
  "uploaded": [{ "id": 1, "filename": "notes.pdf", "preview": "pdf", "size": 91234 }],
  "failed":   [{ "filename": "lecture.mp4", "error": "Файл завеликий, максимум 20 МБ" }]
}
```

If **no** file was saved, `400` is returned with the list of reasons.

---

## Configuration

Ports and database credentials come from `.env` (optional — the defaults in
`.env.example` already work):

```bash
cp .env.example .env
```

| Variable | Default | Meaning |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `vision` / `vision` / `vision_tasks` | Database credentials |
| `POSTGRES_PORT` / `BACKEND_PORT` / `FRONTEND_PORT` / `ADMINER_PORT` | `5432` / `8000` / `3000` / `8080` | Published ports |

Backend settings (`app/core/config.py`, set for containers in `docker-compose.yml`):

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://vision:vision@localhost:5432/vision_tasks` | Database connection |
| `UPLOAD_DIR` | `uploads` | Where files are stored on disk |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `MAX_UPLOAD_SIZE` | 20 MB | Size limit per file |
| `MAX_FILES_PER_TASK` | 20 | Files per task |
| `MAX_TASK_STORAGE` | 100 MB | Total size of a single task's files |
| `TEXT_PREVIEW_LIMIT` | 200 KB | How much text the frontend reads for a preview |

The frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) and fetches
the limits above from `GET /api/limits`, so they are configured in one place.

---

## Project structure

```
.
├── docker-compose.yml      # db + backend + frontend + adminer
├── .env.example            # ports and credentials (optional)
├── Makefile
├── img/                    # logo and readme assets
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml         # dependencies, dev group, pytest settings
│   ├── uv.lock                # pinned versions (uv)
│   ├── alembic.ini
│   ├── migrations/            # schema versions
│   ├── tests/                 # API tests
│   └── app/                   # one package per layer
│       ├── main.py            # FastAPI, CORS, Accept-Language middleware, routers
│       ├── core/
│       │   ├── config.py      # settings and limits from environment variables
│       │   ├── database.py    # Base, async engine + sessions
│       │   └── i18n.py        # localized API messages (uk / en)
│       ├── routers/           # HTTP only
│       │   ├── tasks.py       # /api/tasks, /api/stats
│       │   └── attachments.py # /api/attachments, uploads, /api/limits
│       ├── schemas/           # Pydantic request/response models
│       │   ├── task.py
│       │   └── attachment.py
│       ├── models/            # SQLAlchemy tables
│       │   ├── task.py        # Task, TaskStatus
│       │   └── attachment.py  # Attachment
│       └── utils/             # business logic and file handling
│           ├── tasks.py       # querying, updating, counters, deletion
│           ├── attachments.py # limits, file batches, cleanup
│           ├── storage.py     # saving files to disk
│           └── preview.py     # which files can be shown inline and how
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── bun.lock            # pinned versions (bun)
    ├── app/
    │   ├── layout.tsx      # fonts, LanguageProvider
    │   ├── page.tsx        # the dashboard itself
    │   ├── globals.css
    │   └── favicon.ico
    ├── components/
    │   ├── StatCards.tsx
    │   ├── TaskForm.tsx
    │   ├── TaskBoard.tsx        # kanban board
    │   ├── TaskCard.tsx
    │   ├── TaskDetail.tsx       # task view modal
    │   ├── FilePreview.tsx      # PDF / image / text in the page
    │   ├── FileDropzone.tsx     # drag & drop
    │   ├── LinkifiedText.tsx    # clickable links in descriptions
    │   ├── LanguageProvider.tsx # UA / EN context
    │   └── UploadProgress.tsx
    └── lib/
        ├── api.ts          # FastAPI client (uploads via XHR — for progress)
        ├── files.ts        # size check before sending
        ├── i18n.ts         # UI dictionaries
        ├── types.ts
        └── format.ts
```

---

## Architecture

### Backend

The app is split by layer: `routers/` handles HTTP only (parsing the request and shaping
the response), all logic lives in `utils/` (`tasks.py`, `attachments.py`, plus disk
storage and inline preview rules), `models/` describes the database tables and `schemas/`
the API payloads. `core/` holds settings, database sessions and localized messages.

Model dependencies are one-way: `models/task.py` imports `Attachment` and declares the
SQLAlchemy relationship, while `models/attachment.py` knows nothing about tasks — so
imports never form a cycle.

### Data and files

- Tasks live in Postgres (volume `pgdata`), files on disk in the `uploads` volume, and
  their metadata (name, size, MIME) in the `attachments` table.
- Only PDFs and raster images are served inline (`/view`). Any text, including `.html`,
  is forcibly served as `text/plain`, and SVG and all other formats are download-only:
  otherwise an uploaded file could run a script in the API's origin.
- Both volumes survive `docker compose down`; they are wiped only by `docker compose down -v`.
- Deleting a task cascades to its files, both in the DB and on disk.

### Localization

UI strings and API error messages are bilingual — Ukrainian by default, English on
request. The frontend keeps the choice in `localStorage` and sends `Accept-Language`;
the backend middleware puts it into a context variable that `core/i18n.t()` reads. Every
new string needs both translations: `frontend/lib/i18n.ts` and `backend/app/core/i18n.py`.

---

## Development

### Tests

```bash
docker compose exec backend pytest                                  # make test
docker compose exec backend pytest tests/test_tasks.py::test_create_and_read_task
cd backend && uv run pytest -k upload                               # without Docker
```

33 API tests: creating and filtering tasks, file uploads, partial batch failures, no
orphaned files left on disk, inline preview headers, cascade deletion. They run against a
separate `vision_tasks_test` database — working data is never touched.

### Migrations

The schema is managed by Alembic and `alembic upgrade head` runs automatically when the
backend starts. After changing models:

```bash
make migration m="add priority field"   # generate
make migrate                            # apply
```

### Without Docker

Backend (requires a running Postgres and [uv](https://docs.astral.sh/uv/)):

```bash
cd backend
uv sync                      # creates .venv from uv.lock
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

The defaults are already set up for this scenario: database `vision_tasks` on
`localhost:5432` (the same one docker compose starts), files in the `backend/uploads`
folder. Other values go through `DATABASE_URL` and `UPLOAD_DIR`.

Frontend (requires [bun](https://bun.sh/)):

```bash
cd frontend
bun install                  # installs dependencies from bun.lock
bun run dev
bunx tsc --noEmit            # type check
```

### Dependencies

| | Add | Dev dependency | After |
|---|---|---|---|
| Backend | `uv add <pkg>` | `uv add --dev <pkg>` | `docker compose build backend` |
| Frontend | `bun add <pkg>` | `bun add -d <pkg>` | `docker compose build frontend` |

Both tools update their lock files themselves. After hand-editing `backend/pyproject.toml`,
run `uv lock` (or `make lock`) before rebuilding.

There is no linter or formatter configured.
