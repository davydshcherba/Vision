FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Віртуальне оточення тримаємо поза /app: у docker-compose тека проєкту
# перекривається бінд-маунтом, і .venv усередині неї став би недоступним.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH

WORKDIR /app

# Спершу лише маніфести — шар із залежностями кешується між збірками.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
