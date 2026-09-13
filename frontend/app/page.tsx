"use client";

import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/components/LanguageProvider";
import StatCards from "@/components/StatCards";
import TaskBoard from "@/components/TaskBoard";
import TaskDetail from "@/components/TaskDetail";
import TaskForm from "@/components/TaskForm";
import * as api from "@/lib/api";
import { LANGS } from "@/lib/i18n";
import {
  DEFAULT_LIMITS,
  STATUS_ORDER,
  type Limits,
  type Stats,
  type Task,
  type TaskInput,
  type TaskStatus,
  type UploadResult,
} from "@/lib/types";

type Filter = TaskStatus | "all";

export default function DashboardPage() {
  const { lang, setLang, t } = useI18n();
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
        err instanceof Error ? t.page.backendDown(err.message, api.API_URL) : t.common.unknownError,
      );
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.unknownError);
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

  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: t.page.allBoard },
    ...STATUS_ORDER.map((value) => ({ value: value as Filter, label: t.status[value] })),
  ];

  const openTask = open ? (tasks.find((t) => t.id === open.taskId) ?? null) : null;

  return (
    <main className="page">
      <nav className="masthead">
        <span className="eyebrow">{t.page.eyebrow}</span>
        <span className="wordmark">Vision</span>
        <div className="masthead-end">
          <span className="eyebrow">{stats ? t.page.taskCount(stats.total) : "—"}</span>
          <div className="lang-switch" role="group" aria-label={t.page.language}>
            {LANGS.map((option) => (
              <button
                key={option.value}
                className={`tab ${lang === option.value ? "active" : ""}`}
                onClick={() => setLang(option.value)}
                aria-pressed={lang === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <header className="header">
        <div>
          <h1>
            {t.page.titleStart} <em>{t.page.titleAccent}</em>
          </h1>
          <p>{t.page.subtitle}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t.page.closeForm : t.page.newTask}
        </button>
      </header>

      <StatCards stats={stats} />

      {error && <div className="error">{error}</div>}

      {notice.length > 0 && (
        <div className="notice">
          <div>
            <strong>{t.page.notAllFiles}</strong>
            <ul>
              {notice.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
          <button className="notice-close" onClick={() => setNotice([])} aria-label={t.common.close}>
            ×
          </button>
        </div>
      )}

      {showForm && (
        <TaskForm limits={limits} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      <div className="filters">
        <div className="tabs">
          {tabs.map((tab) => (
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
          placeholder={t.page.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">{t.common.loading}</div>
      ) : tasks.length === 0 ? (
        <div className="empty">
          <strong>{debouncedSearch || filter !== "all" ? t.page.nothingFound : t.page.noTasks}</strong>
          {debouncedSearch || filter !== "all"
            ? t.page.tryFilter
            : t.page.addFirst}
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
