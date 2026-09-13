# Student Task Dashboard

A simple tracker for study assignments: title, description, due date, status and attached files.

**Stack:** FastAPI + SQLAlchemy (async) · PostgreSQL · Next.js 15 (App Router, TypeScript) · Docker Compose.
Dependencies: backend — [uv](https://docs.astral.sh/uv/), frontend — [bun](https://bun.sh/).

---

## Running

Only Docker is required.

```bash
docker compose up --build
```

The first start takes 2–4 minutes (dependencies are installed). After that:

| Service | Address |
|---|---|
| Dashboard (Next.js) | http://localhost:3000 |
| API (FastAPI) | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |
| Adminer (DB viewer) | http://localhost:8080 |
| Postgres | `localhost:5432` |

Migrations are applied automatically when the backend starts — nothing to do.

### Tests

```bash
docker compose exec backend pytest      # or make test
```

32 API tests: creating and filtering tasks, file uploads, partial batch failures,
no orphaned files left on disk, inline preview headers, cascade deletion. They run
against a separate `vision_tasks_test` database — working data is never touched.

### Migrations

The schema is managed by Alembic; `alembic upgrade head` runs automatically when the
backend starts — no need to apply it by hand. After changing models:

```bash
make migration m="add priority field"   # generate
make migrate                            # apply
```

### Useful commands

```bash
docker compose up -d        # in the background
docker compose logs -f      # logs
docker compose down         # stop
docker compose down -v      # stop and wipe the database + uploaded files
```

Or via `make`: `make up`, `make test`, `make logs`, `make down`, `make reset`.

### Database access

Adminer at http://localhost:8080 → system `PostgreSQL`, server `db`, user `vision`, password `vision`, database `vision_tasks`.

Or via psql:

```bash
docker compose exec db psql -U vision -d vision_tasks
```

---

## Features

- Create a task: **title**, **description**, **due date**, **status**
- Attach **files** — both when creating a task and to an existing one (up to 20 MB per file)
- **Task view** in a separate modal: description, deadline, status, all files and dates
- **In-page file preview** — PDFs open in the browser's built-in viewer and can be
  scrolled, images are shown as is, text files are rendered in a monospace font.
  No need to download a file just to take a look
- **Three-column board** — To do / In progress / Done. Within a column tasks are
  sorted by deadline: nearest first, undated ones at the end
- **Drag & drop**: a card can be dragged to another column (or moved with the ← →
  arrows), files can simply be dropped onto a card or the upload zone
- **Upload progress** in percent (a large PDF no longer hangs silently)
- File size is checked **before sending** — an oversized file won't travel over the network for nothing
- One bad file in a batch **doesn't block the rest**: the others are saved, and it
  shows up in a warning with the reason
- Rename and delete files, image thumbnails in the file list
- Edit a task and change its status (To do / In progress / Done)
- Search by title and description, filter by status — leaves a single column
- Counters at the top, including **overdue** deadlines
- Delete a task together with its files (both from disk and from the DB)

> The UI and API error messages are in Ukrainian.

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
| `DELETE` | `/api/attachments/{id}` | Delete a file |
| `PATCH` | `/api/attachments/{id}` | Rename a file |
| `GET` | `/api/stats` | Dashboard counters |
| `GET` | `/api/limits` | Server limits (read by the frontend) |
| `GET` | `/health` | Liveness check |

Example:

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

## Structure

```
.
├── docker-compose.yml      # db + backend + frontend + adminer
├── .env.example            # ports and credentials (optional)
├── Makefile
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml         # dependencies, dev group, pytest settings
│   ├── uv.lock                # pinned versions (uv)
│   ├── alembic.ini
│   ├── migrations/            # schema versions
│   ├── tests/                 # API tests
│   └── app/                   # one package per layer
│       ├── main.py            # FastAPI, CORS, router registration
│       ├── core/
│       │   ├── config.py      # settings and limits from environment variables
│       │   └── database.py    # Base, async engine + sessions
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
    │   ├── layout.tsx
    │   ├── page.tsx        # the dashboard itself
    │   └── globals.css
    ├── components/
    │   ├── StatCards.tsx
    │   ├── TaskForm.tsx
    │   ├── TaskBoard.tsx      # kanban board
    │   ├── TaskCard.tsx
    │   ├── TaskDetail.tsx     # task view modal
    │   ├── FilePreview.tsx    # PDF / image / text in the page
    │   ├── FileDropzone.tsx   # drag & drop
    │   ├── LinkifiedText.tsx  # clickable links in descriptions
    │   └── UploadProgress.tsx
    └── lib/
        ├── api.ts            # FastAPI client (uploads via XHR — for progress)
        ├── files.ts          # size check before sending
        ├── types.ts
        └── format.ts
```

---

## Backend architecture

The app is split by layer: `routers/` handles HTTP only (parsing the request and
shaping the response), all logic lives in `utils/` (`tasks.py`, `attachments.py`,
plus disk storage and inline preview rules), `models/` describes the database tables
and `schemas/` the API payloads. `core/` holds settings and database sessions.

Model dependencies are one-way: `models/task.py` imports `Attachment` and declares the
SQLAlchemy relationship, while `models/attachment.py` knows nothing about tasks. So
imports never form a cycle.

## Data and files

- Tasks live in Postgres (volume `pgdata`), files on disk in the `uploads` volume, and their metadata (name, size, MIME) in the `attachments` table.
- Only PDFs and raster images are served inline (`/view`). Any text, including `.html`, is forcibly served as `text/plain`, and SVG and all other formats are download-only: otherwise an uploaded file could run a script in the API's origin.
- Both volumes survive `docker compose down`; they are wiped only by `docker compose down -v`.
- Deleting a task cascades to its files, both in the DB and on disk.

## Development without Docker

Backend (requires a running Postgres and [uv](https://docs.astral.sh/uv/)):

```bash
cd backend
uv sync                      # creates .venv from uv.lock
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
uv run pytest                # tests
```

The defaults are already set up for this scenario: database `vision_tasks` on `localhost:5432`
(the same one docker compose starts), files in the `backend/uploads` folder. Other values
are set via the `DATABASE_URL` and `UPLOAD_DIR` variables.

Dependencies live in `backend/pyproject.toml`, exact versions in `uv.lock`. To add a
package: `uv add <package>` (or `uv add --dev <package>` for dev tooling) — uv updates
the lock itself. After hand-editing `pyproject.toml`, run `uv lock` (or `make lock`) and
`docker compose build backend`.

Frontend (requires [bun](https://bun.sh/)):

```bash
cd frontend
bun install                  # installs dependencies from bun.lock
bun run dev
```

To add a package: `bun add <package>` (`bun add -d <package>` for a dev dependency) — the lock
updates itself, then `docker compose build frontend`.
