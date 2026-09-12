from datetime import date, timedelta

TODAY = date.today()


async def test_create_and_read_task(client):
    payload = {
        "title": "Лабораторна №3",
        "description": "Нормальні форми",
        "due_date": str(TODAY + timedelta(days=3)),
        "status": "in_progress",
    }
    created = (await client.post("/api/tasks", json=payload)).json()

    assert created["title"] == payload["title"]
    assert created["status"] == "in_progress"
    assert created["attachments"] == []

    fetched = (await client.get(f"/api/tasks/{created['id']}")).json()
    assert fetched == created


async def test_title_is_required(client):
    assert (await client.post("/api/tasks", json={"title": ""})).status_code == 422
    assert (await client.post("/api/tasks", json={})).status_code == 422


async def test_missing_task_returns_404(client):
    assert (await client.get("/api/tasks/9999")).status_code == 404


async def test_default_status_is_todo(client, task):
    assert task["status"] == "todo"
    assert task["due_date"] is None


async def test_filter_by_status(client):
    await client.post("/api/tasks", json={"title": "А", "status": "todo"})
    await client.post("/api/tasks", json={"title": "Б", "status": "done"})

    done = (await client.get("/api/tasks", params={"status": "done"})).json()
    assert [t["title"] for t in done] == ["Б"]


async def test_search_matches_title_and_description(client):
    await client.post("/api/tasks", json={"title": "Курсова", "description": "розділ про графи"})
    await client.post("/api/tasks", json={"title": "Реферат", "description": "філософія"})

    by_title = (await client.get("/api/tasks", params={"q": "курсов"})).json()
    assert [t["title"] for t in by_title] == ["Курсова"]

    by_description = (await client.get("/api/tasks", params={"q": "графи"})).json()
    assert [t["title"] for t in by_description] == ["Курсова"]


async def test_tasks_sorted_by_due_date_with_undated_last(client):
    await client.post("/api/tasks", json={"title": "без дати"})
    await client.post("/api/tasks", json={"title": "пізніше", "due_date": str(TODAY + timedelta(days=9))})
    await client.post("/api/tasks", json={"title": "скоро", "due_date": str(TODAY + timedelta(days=1))})

    titles = [t["title"] for t in (await client.get("/api/tasks")).json()]
    assert titles == ["скоро", "пізніше", "без дати"]


async def test_partial_update_keeps_other_fields(client, task):
    updated = (await client.patch(f"/api/tasks/{task['id']}", json={"status": "done"})).json()

    assert updated["status"] == "done"
    assert updated["title"] == task["title"]


async def test_clearing_due_date(client):
    created = (await client.post("/api/tasks", json={"title": "З дедлайном", "due_date": str(TODAY)})).json()
    updated = (await client.patch(f"/api/tasks/{created['id']}", json={"due_date": None})).json()

    assert updated["due_date"] is None


async def test_delete_task(client, task):
    assert (await client.delete(f"/api/tasks/{task['id']}")).status_code == 204
    assert (await client.get(f"/api/tasks/{task['id']}")).status_code == 404


async def test_stats_counts_overdue_but_ignores_done(client):
    await client.post("/api/tasks", json={"title": "прострочена", "due_date": str(TODAY - timedelta(days=2))})
    await client.post(
        "/api/tasks",
        json={"title": "прострочена але здана", "due_date": str(TODAY - timedelta(days=5)), "status": "done"},
    )
    await client.post("/api/tasks", json={"title": "в роботі", "status": "in_progress"})

    stats = (await client.get("/api/stats")).json()
    assert stats == {"total": 3, "todo": 1, "in_progress": 1, "done": 1, "overdue": 1}


async def test_limits_endpoint(client):
    limits = (await client.get("/api/limits")).json()

    assert limits["max_upload_size"] > 0
    assert limits["max_files_per_task"] > 0
    assert limits["text_preview_limit"] > 0
