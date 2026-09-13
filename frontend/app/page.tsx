"use client";

import { useCallback, useEffect, useState } from "react";

import StatCards from "@/components/StatCards";
import TaskBoard from "@/components/TaskBoard";
import TaskDetail from "@/components/TaskDetail";
import TaskForm from "@/components/TaskForm";
import * as api from "@/lib/api";
import {
  DEFAULT_LIMITS,
  STATUS_LABELS,
  STATUS_ORDER,
  type Limits,
  type Stats,
  type Task,
  type TaskInput,
  type TaskStatus,
  type UploadResult,
} from "@/lib/types";

type Filter = TaskStatus | "all";

const TABS: { value: Filter; label: string }[] = [
  { value: "all", label: "Уся дошка" },
  ...STATUS_ORDER.map((value) => ({ value: value as Filter, label: STATUS_LABELS[value] })),
];

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string[]>([]);
  const [open, setOpen] = useState<{ taskId: number; fileId: number | null } | null>(null);

  // * Don't hit the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // * Limits are static — once is enough; if they fail to load, keep the defaults
  useEffect(() => {
    api.getLimits().then(setLimits).catch(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [taskList, statsData] = await Promise.all([
        api.listTasks({ status: filter, q: debouncedSearch }),
        api.getStats(),
      ]);
      setTasks(taskList);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Перевір, чи запущений бекенд на ${api.API_URL}`
          : "Невідома помилка",
      );
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Невідома помилка");
    }
  }

  /** Part of the batch may have failed — show exactly what and why. */
  function reportFailures(result: UploadResult) {
    setNotice(result.failed.map((f) => `${f.filename}: ${f.error}`));
  }

  function uploadFiles(taskId: number, files: File[], onProgress: (percent: number) => void) {
    return run(async () => {
      reportFailures(await api.uploadAttachments(taskId, files, onProgress));
    });
  }

  async function handleCreate(
    data: TaskInput,
    files: File[],
    onProgress: (percent: number) => void,
  ) {
    await run(async () => {
      const task = await api.createTask(data);
      if (files.length > 0) {
        reportFailures(await api.uploadAttachments(task.id, files, onProgress));
      } else {
        setNotice([]);
      }
      setShowForm(false);
    });
  }

  const openTask = open ? (tasks.find((t) => t.id === open.taskId) ?? null) : null;

  return (
    <main className="page">
      <nav className="masthead">
        <span className="eyebrow">Дашборд студента</span>
        <span className="wordmark">Vision</span>
        <span className="eyebrow">{stats ? `${stats.total} задач` : "—"}</span>
      </nav>

      <header className="header">
        <div>
          <h1>
            Мої <em>задачі</em>
          </h1>
          <p>Перетягуй картки між колонками — у кожній спершу найближчі дедлайни.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Закрити форму" : "Нова задача"}
        </button>
      </header>

      <StatCards stats={stats} />

      {error && <div className="error">{error}</div>}

      {notice.length > 0 && (
        <div className="notice">
          <div>
            <strong>Не всі файли додано:</strong>
            <ul>
              {notice.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
          <button className="notice-close" onClick={() => setNotice([])} aria-label="Закрити">
            ×
          </button>
        </div>
      )}

      {showForm && (
        <TaskForm limits={limits} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      <div className="filters">
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              className={`tab ${filter === tab.value ? "active" : ""}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          className="input search"
          type="search"
          placeholder="Пошук за назвою або описом..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Завантаження...</div>
      ) : tasks.length === 0 ? (
        <div className="empty">
          <strong>{debouncedSearch || filter !== "all" ? "Нічого не знайдено" : "Задач поки немає"}</strong>
          {debouncedSearch || filter !== "all"
            ? "Спробуй змінити фільтр або пошуковий запит."
            : "Натисни «Нова задача», щоб додати перше завдання."}
        </div>
      ) : (
        <TaskBoard
          tasks={tasks}
          columns={filter === "all" ? STATUS_ORDER : [filter]}
          limits={limits}
          onUpdate={(id, data) => run(async () => void (await api.updateTask(id, data)))}
          onDelete={(id) => run(async () => await api.deleteTask(id))}
          onUploadFiles={uploadFiles}
          onOpen={(taskId, fileId) => setOpen({ taskId, fileId: fileId ?? null })}
          onReject={setNotice}
        />
      )}

      {openTask && (
        <TaskDetail
          task={openTask}
          limits={limits}
          initialFileId={open?.fileId}
          onClose={() => setOpen(null)}
          onUpdate={(id, data) => run(async () => void (await api.updateTask(id, data)))}
          onUploadFiles={uploadFiles}
          onRenameFile={(id, filename) =>
            run(async () => void (await api.renameAttachment(id, filename)))
          }
          onDeleteFile={(id) => run(async () => await api.deleteAttachment(id))}
          onReject={setNotice}
        />
      )}
    </main>
  );
}
