# Дашборд задач для студента

Простий трекер навчальних завдань: назва, опис, дата виконання, статус і прикріплені файли.

**Стек:** FastAPI + SQLAlchemy (async) · PostgreSQL · Next.js 15 (App Router, TypeScript) · Docker Compose.
Залежності: бекенд — [uv](https://docs.astral.sh/uv/), фронтенд — [bun](https://bun.sh/).

---

## Запуск

Потрібен лише Docker.

```bash
docker compose up --build
```

Перший запуск триває 2–4 хвилини (ставляться залежності). Далі:

| Сервіс | Адреса |
|---|---|
| Дашборд (Next.js) | http://localhost:3000 |
| API (FastAPI) | http://localhost:8000 |
| Swagger-документація | http://localhost:8000/docs |
| Adminer (перегляд БД) | http://localhost:8080 |
| Postgres | `localhost:5432` |

Міграції накочуються автоматично при старті бекенду — робити нічого не треба.

### Тести

```bash
docker compose exec backend pytest      # або make test
```

32 тести на API: створення й фільтрація задач, завантаження файлів, часткові помилки
пачки, відсутність осиротілих файлів на диску, заголовки інлайн-перегляду, каскадне
видалення. Ганяються на окремій базі `vision_tasks_test` — робочі дані не чіпають.

### Міграції

Схему тримає Alembic, `alembic upgrade head` виконується автоматично при старті
бекенда — накатувати вручну не треба. Після зміни моделей:

```bash
make migration m="додав поле пріоритету"   # згенерувати
make migrate                               # накатити
```

### Корисні команди

```bash
docker compose up -d        # у фоні
docker compose logs -f      # логи
docker compose down         # зупинити
docker compose down -v      # зупинити і стерти базу + завантажені файли
```

Або через `make`: `make up`, `make test`, `make logs`, `make down`, `make reset`.

### Доступ до бази

Adminer на http://localhost:8080 → система `PostgreSQL`, сервер `db`, користувач `vision`, пароль `vision`, база `vision_tasks`.

Або через psql:

```bash
docker compose exec db psql -U vision -d vision_tasks
```

---

## Що вміє

- Створення задачі: **назва**, **опис**, **дата виконання**, **статус**
- Прикріплення **файлів** — і при створенні, і до вже наявної задачі (до 20 МБ на файл)
- **Перегляд задачі** в окремому вікні: опис, дедлайн, статус, усі файли й дати
- **Попередній перегляд файлів прямо на сторінці** — PDF відкривається у вбудованому
  переглядачі браузера й гортається, картинки показуються як є, текстові файли
  читаються моноширинним шрифтом. Качати файл, щоб просто глянути, не треба
- **Drag & drop**: файли можна просто перетягнути на зону завантаження
- **Прогрес завантаження** у відсотках (великий PDF більше не висить мовчки)
- Розмір перевіряється **до відправки** — завеликий файл не поїде по мережі дарма
- Один проблемний файл у пачці **не блокує решту**: решта зберігається, а він
  потрапляє в попередження з причиною
- Перейменування та видалення файлів, мініатюри картинок у списку
- Редагування задачі та зміна статусу (До виконання / В роботі / Виконано)
- Пошук за назвою й описом, фільтр за статусом
- Лічильники зверху, зокрема **прострочені** дедлайни
- Видалення задачі разом з її файлами (і з диска, і з БД)

---

## API

| Метод | Шлях | Опис |
|---|---|---|
| `GET` | `/api/tasks?status=&q=` | Список задач (фільтр за статусом, пошук) |
| `POST` | `/api/tasks` | Створити задачу |
| `GET` | `/api/tasks/{id}` | Одна задача |
| `PATCH` | `/api/tasks/{id}` | Оновити поля задачі |
| `DELETE` | `/api/tasks/{id}` | Видалити задачу з файлами |
| `POST` | `/api/tasks/{id}/attachments` | Завантажити файли (multipart, поле `files`) |
| `GET` | `/api/attachments/{id}/view` | Показати файл у браузері (`Content-Disposition: inline`) |
| `GET` | `/api/attachments/{id}/download` | Скачати файл |
| `DELETE` | `/api/attachments/{id}` | Видалити файл |
| `PATCH` | `/api/attachments/{id}` | Перейменувати файл |
| `GET` | `/api/stats` | Лічильники для дашборда |
| `GET` | `/api/limits` | Ліміти сервера (їх читає фронтенд) |
| `GET` | `/health` | Перевірка живості |

Приклад:

```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Курсова робота","description":"Розділ 1","due_date":"2026-10-01"}'

curl -X POST http://localhost:8000/api/tasks/1/attachments -F "files=@конспект.pdf"
```

Завантаження повертає, що саме збереглося, а що ні:

```json
{
  "uploaded": [{ "id": 1, "filename": "конспект.pdf", "preview": "pdf", "size": 91234 }],
  "failed":   [{ "filename": "лекція.mp4", "error": "Файл завеликий, максимум 20 МБ" }]
}
```

Якщо не зберігся **жодний** файл — повертається `400` зі списком причин.

---

## Структура

```
.
├── docker-compose.yml      # db + backend + frontend + adminer
├── .env.example            # порти й креденшели (опційно)
├── Makefile
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml         # залежності, dev-група, налаштування pytest
│   ├── uv.lock                # зафіксовані версії (uv)
│   ├── alembic.ini
│   ├── migrations/            # версії схеми
│   ├── tests/                 # тести на API
│   └── app/                   # по модулю на домен
│       ├── main.py            # FastAPI, CORS, підключення роутерів
│       ├── core/
│       │   ├── config.py      # налаштування й ліміти зі змінних середовища
│       │   └── database.py    # Base, async engine + сесії
│       ├── tasks/
│       │   ├── router.py      # HTTP: /api/tasks, /api/stats
│       │   ├── service.py     # вибірка, зміна, лічильники, видалення
│       │   ├── models.py      # Task, TaskStatus
│       │   └── schemas.py
│       ├── attachments/
│       │   ├── router.py      # HTTP: /api/attachments, завантаження, /api/limits
│       │   ├── service.py     # ліміти, пачка файлів, прибирання за собою
│       │   ├── models.py      # Attachment
│       │   └── schemas.py
│       └── files/             # робота з диском, спільна для модулів
│           ├── storage.py     # збереження файлів на диск
│           └── preview.py     # який файл можна показати інлайн і як
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── bun.lock            # зафіксовані версії (bun)
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx        # сам дашборд
    │   └── globals.css
    ├── components/
    │   ├── StatCards.tsx
    │   ├── TaskForm.tsx
    │   ├── TaskCard.tsx
    │   ├── TaskDetail.tsx     # вікно перегляду задачі
    │   ├── FilePreview.tsx    # PDF / картинка / текст у сторінці
    │   ├── FileDropzone.tsx   # drag & drop
    │   └── UploadProgress.tsx
    └── lib/
        ├── api.ts            # клієнт до FastAPI (завантаження через XHR — заради прогресу)
        ├── files.ts          # перевірка розміру до відправки
        ├── types.ts
        └── format.ts
```

---

## Архітектура бекенду

Кожен домен — самодостатній пакет: `router.py` відповідає лише за HTTP (розбір
запиту й формування відповіді), уся логіка живе в `service.py`, а `models.py` і
`schemas.py` описують домен для бази й для API. Спільне лежить у `core/`
(налаштування, сесії) та `files/` (диск і правила інлайн-перегляду).

Залежності між модулями односторонні: `attachments` знає про `tasks` (файл
завжди належить задачі), у зворотний бік — лише зв'язок SQLAlchemy, який
оголошує `tasks/models.py`. Тому імпорти не закільцьовуються.

## Дані та файли

- Задачі — у Postgres (том `pgdata`), файли — на диску в томі `uploads`, а їх метадані (ім'я, розмір, MIME) — в таблиці `attachments`.
- Інлайн (`/view`) віддаються тільки PDF і растрові картинки. Будь-який текст, включно з `.html`, примусово віддається як `text/plain`, а SVG та решта форматів — лише завантаженням: інакше завантажений файл міг би виконати скрипт у походженні API.
- Обидва томи переживають `docker compose down`; стираються лише через `docker compose down -v`.
- Видалення задачі каскадно прибирає її файли і з БД, і з диска.

## Розробка без Docker

Бекенд (потрібен запущений Postgres і [uv](https://docs.astral.sh/uv/)):

```bash
cd backend
uv sync                      # створить .venv за uv.lock
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
uv run pytest                # тести
```

Дефолти вже налаштовані на цей сценарій: база — `vision_tasks` на `localhost:5432`
(та сама, що піднімає docker compose), файли — тека `backend/uploads`. Інші значення
задаються змінними `DATABASE_URL` і `UPLOAD_DIR`.

Залежності живуть у `backend/pyproject.toml`, точні версії — в `uv.lock`. Щоб додати
пакет: `uv add <пакет>` (або `uv add --dev <пакет>` для інструментів розробки) — uv сам
оновить лок. Після ручного правлення `pyproject.toml` — `uv lock` (або `make lock`) і
`docker compose build backend`.

Фронтенд (потрібен [bun](https://bun.sh/)):

```bash
cd frontend
bun install                  # поставить залежності за bun.lock
bun run dev
```

Додати пакет: `bun add <пакет>` (`bun add -d <пакет>` для dev-залежності) — лок
оновиться сам, далі `docker compose build frontend`.
