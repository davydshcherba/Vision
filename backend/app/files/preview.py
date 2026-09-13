"""Decides exactly how a file is shown in the browser.

Single source of truth: both the schema (the `preview` field for the frontend)
and the inline view route use these functions.
"""

from pathlib import Path
from typing import Literal

PreviewKind = Literal["pdf", "image", "text"]

IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/avif",
}

EXT_TO_IMAGE = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
}

TEXT_TYPES = {"application/json", "application/xml", "application/javascript"}

TEXT_EXTS = {
    ".txt", ".md", ".csv", ".json", ".log", ".xml", ".yml", ".yaml",
    ".py", ".js", ".ts", ".tsx", ".css", ".html", ".sql", ".sh", ".ini", ".env",
}


def _normalize(content_type: str | None) -> str:
    return (content_type or "").split(";")[0].strip().lower()


def preview_kind(content_type: str | None, filename: str | None) -> PreviewKind | None:
    """How to show a file: pdf / image / text, or None for download only."""
    ct = _normalize(content_type)
    ext = Path(filename or "").suffix.lower()

    if ct == "application/pdf" or ext == ".pdf":
        return "pdf"

    # ! SVG is deliberately never shown inline — it may contain scripts
    if ct in IMAGE_TYPES or ext in EXT_TO_IMAGE:
        return "image"

    if ct.startswith("text/") or ct in TEXT_TYPES or ext in TEXT_EXTS:
        return "text"

    return None


def inline_media_type(content_type: str | None, filename: str | None) -> str | None:
    """MIME type for inline serving, or None if inline is not allowed.

    The type is intentionally not taken from what the client sent: otherwise
    an HTML file would execute in the API's origin.
    """
    kind = preview_kind(content_type, filename)
    ct = _normalize(content_type)
    ext = Path(filename or "").suffix.lower()

    if kind == "pdf":
        return "application/pdf"

    if kind == "image":
        if ct in IMAGE_TYPES:
            return ct
        return EXT_TO_IMAGE.get(ext)

    if kind == "text":
        # ! any text (including .html) is served as plain text
        return "text/plain; charset=utf-8"

    return None
