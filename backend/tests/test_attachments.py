import pytest

from app.core.config import settings

from .conftest import PDF_BYTES, PNG_BYTES, upload_file


async def _attach(client, task_id, *files):
    return await client.post(f"/api/tasks/{task_id}/attachments", files=list(files))


async def test_upload_returns_preview_kind(client, task):
    response = await _attach(
        client,
        task["id"],
        upload_file("конспект.pdf", PDF_BYTES, "application/pdf"),
        upload_file("схема.png", PNG_BYTES, "image/png"),
        upload_file("нотатки.txt", "привіт".encode(), "text/plain"),
    )
    assert response.status_code == 201

    body = response.json()
    assert body["failed"] == []
    assert [(f["filename"], f["preview"]) for f in body["uploaded"]] == [
        ("конспект.pdf", "pdf"),
        ("схема.png", "image"),
        ("нотатки.txt", "text"),
    ]


async def test_archive_has_no_preview(client, task):
    body = (await _attach(client, task["id"], upload_file("архів.zip", b"PK\x03\x04", "application/zip"))).json()
    assert body["uploaded"][0]["preview"] is None


async def test_path_traversal_in_filename_is_stripped(client, task):
    body = (await _attach(client, task["id"], upload_file("../../../etc/passwd", PDF_BYTES, "application/pdf"))).json()
    assert body["uploaded"][0]["filename"] == "passwd"


async def test_empty_file_is_rejected(client, task):
    response = await _attach(client, task["id"], upload_file("пусто.txt", b"", "text/plain"))

    assert response.status_code == 400
    assert "пусто.txt" in response.json()["detail"]


async def test_oversized_file_does_not_block_the_rest(client, task, monkeypatch, uploads):
    monkeypatch.setattr(settings, "max_upload_size", 64)

    response = await _attach(
        client,
        task["id"],
        upload_file("норм.txt", b"ok", "text/plain"),
        upload_file("великий.bin", b"x" * 500, "application/octet-stream"),
    )

    assert response.status_code == 201
    body = response.json()
    assert [f["filename"] for f in body["uploaded"]] == ["норм.txt"]
    assert body["failed"][0]["filename"] == "великий.bin"
    assert "завеликий" in body["failed"][0]["error"]

    # на диску рівно один файл — той, що зберігся
    assert len(list(uploads.iterdir())) == 1


async def test_failed_batch_leaves_no_orphan_files(client, task, monkeypatch, uploads):
    monkeypatch.setattr(settings, "max_upload_size", 64)

    response = await _attach(
        client,
        task["id"],
        upload_file("а.bin", b"x" * 500, "application/octet-stream"),
        upload_file("б.bin", b"y" * 500, "application/octet-stream"),
    )

    assert response.status_code == 400
    assert list(uploads.iterdir()) == []
    assert (await client.get(f"/api/tasks/{task['id']}")).json()["attachments"] == []


async def test_max_files_per_task(client, task, monkeypatch):
    monkeypatch.setattr(settings, "max_files_per_task", 2)

    body = (
        await _attach(
            client,
            task["id"],
            upload_file("1.txt", b"a", "text/plain"),
            upload_file("2.txt", b"b", "text/plain"),
            upload_file("3.txt", b"c", "text/plain"),
        )
    ).json()

    assert len(body["uploaded"]) == 2
    assert body["failed"][0]["filename"] == "3.txt"


async def test_task_storage_limit(client, task, monkeypatch, uploads):
    monkeypatch.setattr(settings, "max_task_storage", 10)

    body = (
        await _attach(
            client,
            task["id"],
            upload_file("малий.txt", b"12345", "text/plain"),
            upload_file("завеликий.txt", b"1234567890", "text/plain"),
        )
    ).json()

    assert [f["filename"] for f in body["uploaded"]] == ["малий.txt"]
    assert "ліміт" in body["failed"][0]["error"].lower()
    assert len(list(uploads.iterdir())) == 1


@pytest.mark.parametrize(
    ("name", "content_type", "expected_type", "expected_disposition"),
    [
        ("файл.pdf", "application/pdf", "application/pdf", "inline"),
        ("картинка.png", "image/png", "image/png", "inline"),
        ("нотатки.txt", "text/plain", "text/plain; charset=utf-8", "inline"),
        ("сторінка.html", "text/html", "text/plain; charset=utf-8", "inline"),
        ("вектор.svg", "image/svg+xml", "image/svg+xml", "attachment"),
        ("архів.zip", "application/zip", "application/zip", "attachment"),
    ],
)
async def test_view_serves_safe_types_only(
    client, task, name, content_type, expected_type, expected_disposition
):
    body = (await _attach(client, task["id"], upload_file(name, PDF_BYTES, content_type))).json()
    attachment_id = body["uploaded"][0]["id"]

    response = await client.get(f"/api/attachments/{attachment_id}/view")

    assert response.status_code == 200
    assert response.headers["content-type"] == expected_type
    assert response.headers["content-disposition"].startswith(expected_disposition)


async def test_download_is_always_attachment(client, task):
    body = (await _attach(client, task["id"], upload_file("конспект.pdf", PDF_BYTES, "application/pdf"))).json()
    response = await client.get(f"/api/attachments/{body['uploaded'][0]['id']}/download")

    assert response.status_code == 200
    assert response.headers["content-disposition"].startswith("attachment")
    assert response.content == PDF_BYTES


async def test_rename_attachment_sanitizes_path(client, task):
    body = (await _attach(client, task["id"], upload_file("старе.pdf", PDF_BYTES, "application/pdf"))).json()
    attachment_id = body["uploaded"][0]["id"]

    renamed = (
        await client.patch(f"/api/attachments/{attachment_id}", json={"filename": "../../нове.pdf"})
    ).json()

    assert renamed["filename"] == "нове.pdf"
    assert renamed["preview"] == "pdf"


async def test_delete_attachment_removes_file_from_disk(client, task, uploads):
    body = (await _attach(client, task["id"], upload_file("конспект.pdf", PDF_BYTES, "application/pdf"))).json()
    assert len(list(uploads.iterdir())) == 1

    assert (await client.delete(f"/api/attachments/{body['uploaded'][0]['id']}")).status_code == 204
    assert list(uploads.iterdir()) == []


async def test_deleting_task_removes_its_files(client, task, uploads):
    await _attach(
        client,
        task["id"],
        upload_file("а.pdf", PDF_BYTES, "application/pdf"),
        upload_file("б.png", PNG_BYTES, "image/png"),
    )
    assert len(list(uploads.iterdir())) == 2

    assert (await client.delete(f"/api/tasks/{task['id']}")).status_code == 204
    assert list(uploads.iterdir()) == []


async def test_view_reports_missing_file_on_disk(client, task, uploads):
    body = (await _attach(client, task["id"], upload_file("конспект.pdf", PDF_BYTES, "application/pdf"))).json()
    for path in uploads.iterdir():
        path.unlink()

    assert (await client.get(f"/api/attachments/{body['uploaded'][0]['id']}/view")).status_code == 404


async def test_upload_to_missing_task_returns_404(client):
    assert (await _attach(client, 9999, upload_file("а.txt", b"a", "text/plain"))).status_code == 404
