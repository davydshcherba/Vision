"""Localized API error messages (Ukrainian by default, English on request).

The language is chosen per request from the Accept-Language header and kept in a
context variable, so services can call `t()` without passing the request around.
"""

from contextvars import ContextVar
from typing import Literal

Lang = Literal["uk", "en"]

DEFAULT_LANG: Lang = "uk"

current_lang: ContextVar[Lang] = ContextVar("current_lang", default=DEFAULT_LANG)

MESSAGES: dict[str, dict[Lang, str]] = {
    "task_not_found": {
        "uk": "Задачу не знайдено",
        "en": "Task not found",
    },
    "file_not_found": {
        "uk": "Файл не знайдено",
        "en": "File not found",
    },
    "file_missing_on_disk": {
        "uk": "Файл відсутній на диску",
        "en": "The file is missing on disk",
    },
    "file_limit_reached": {
        "uk": "Ліміт {limit} файлів на задачу вичерпано",
        "en": "The limit of {limit} files per task has been reached",
    },
    "task_storage_exceeded": {
        "uk": "Перевищено сумарний ліміт задачі ({limit_mb} МБ)",
        "en": "The task's total storage limit is exceeded ({limit_mb} MB)",
    },
    "nothing_uploaded": {
        "uk": "Не вдалося завантажити жодного файлу",
        "en": "No files could be uploaded",
    },
    "empty_filename": {
        "uk": "Порожня назва файлу",
        "en": "The file name is empty",
    },
    "file_too_large": {
        "uk": "Файл завеликий, максимум {limit_mb} МБ",
        "en": "The file is too large, {limit_mb} MB max",
    },
    "empty_file": {
        "uk": "Порожній файл",
        "en": "Empty file",
    },
}


def pick_language(accept_language: str | None) -> Lang:
    """The first supported language from Accept-Language, e.g. "en-GB,en;q=0.9" -> "en"."""
    for part in (accept_language or "").split(","):
        code = part.split(";")[0].strip().lower()[:2]
        if code == "en":
            return "en"
        if code in ("uk", "ua"):
            return "uk"
    return DEFAULT_LANG


def t(key: str, **params: object) -> str:
    return MESSAGES[key][current_lang.get()].format(**params)
