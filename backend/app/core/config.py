from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings. Read from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # * Defaults target running without Docker: the docker-compose database
    # * exposed on localhost and a folder next to the code. In the container
    # * docker-compose overrides both values (DATABASE_URL, UPLOAD_DIR).
    database_url: str = "postgresql+asyncpg://vision:vision@localhost:5432/vision_tasks"
    upload_dir: str = "uploads"
    cors_origins: str = "http://localhost:3000"

    # 20 MB per file
    max_upload_size: int = 20 * 1024 * 1024
    # how many files can be attached to a single task
    max_files_per_task: int = 20
    # total size of a single task's files
    max_task_storage: int = 100 * 1024 * 1024
    # how many bytes of text the frontend reads for a preview
    text_preview_limit: int = 200 * 1024

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
