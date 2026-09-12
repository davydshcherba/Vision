from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Налаштування застосунку. Читаються зі змінних середовища."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://vision:vision@localhost:5432/vision"
    upload_dir: str = "/app/uploads"
    cors_origins: str = "http://localhost:3000"

    # 20 МБ на один файл
    max_upload_size: int = 20 * 1024 * 1024
    # скільки файлів можна прикріпити до однієї задачі
    max_files_per_task: int = 20
    # сумарний обсяг файлів однієї задачі
    max_task_storage: int = 100 * 1024 * 1024
    # скільки байтів тексту фронтенд читає для попереднього перегляду
    text_preview_limit: int = 200 * 1024

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
