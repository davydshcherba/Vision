import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

CHUNK_SIZE = 1024 * 1024


async def save_upload(file: UploadFile, upload_dir: Path, max_size: int) -> tuple[str, int]:
    """Зберігає файл на диск під унікальним ім'ям. Повертає (ім'я на диску, розмір)."""
    upload_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix[:20]
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    target = upload_dir / stored_name

    size = 0
    try:
        with target.open("wb") as out:
            while chunk := await file.read(CHUNK_SIZE):
                size += len(chunk)
                if size > max_size:
                    raise HTTPException(
                        status_code=413,  # назва константи різниться між версіями starlette
                        detail=f"Файл завеликий, максимум {max_size // (1024 * 1024)} МБ",
                    )
                out.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    if size == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Порожній файл")

    return stored_name, size


def delete_file(upload_dir: Path, stored_name: str) -> None:
    (upload_dir / stored_name).unlink(missing_ok=True)


def safe_filename(raw: str | None) -> str:
    name = Path(raw or "file").name.strip() or "file"
    return name[:255]
