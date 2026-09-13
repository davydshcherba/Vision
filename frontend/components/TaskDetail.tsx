"use client";

import { useEffect, useRef, useState } from "react";

import FileDropzone from "@/components/FileDropzone";
import FilePreview from "@/components/FilePreview";
import LinkifiedText from "@/components/LinkifiedText";
import UploadProgress from "@/components/UploadProgress";
import { attachmentUrl, attachmentViewUrl } from "@/lib/api";
import { splitBySize } from "@/lib/files";
import { daysLeft, deadlineLabel, formatDate, formatSize } from "@/lib/format";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type Limits,
  type Task,
  type TaskInput,
  type TaskStatus,
} from "@/lib/types";

interface Props {
  task: Task;
  limits: Limits;
  initialFileId?: number | null;
  onClose: () => void;
  onUpdate: (id: number, data: Partial<TaskInput>) => Promise<void>;
  onUploadFiles: (id: number, files: File[], onProgress: (percent: number) => void) => Promise<void>;
  onRenameFile: (attachmentId: number, filename: string) => Promise<void>;
  onDeleteFile: (attachmentId: number) => Promise<void>;
  onReject: (messages: string[]) => void;
}

const FILE_KINDS: Record<string, string> = { pdf: "PDF", image: "IMG", text: "TXT" };

export default function TaskDetail({
  task,
  limits,
  initialFileId,
  onClose,
  onUpdate,
  onUploadFiles,
  onRenameFile,
  onDeleteFile,
  onReject,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(
    initialFileId ?? task.attachments[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const knownIds = useRef<number[]>(task.attachments.map((a) => a.id));

  const days = daysLeft(task.due_date);
  const overdue = task.status !== "done" && days !== null && days < 0;
  const selected = task.attachments.find((a) => a.id === selectedId) ?? null;

  // Esc закриває, фон під модалкою не скролиться
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Після завантаження одразу показуємо новий файл; видалений — замінюємо першим
  useEffect(() => {
    const ids = task.attachments.map((a) => a.id);
    const added = ids.filter((id) => !knownIds.current.includes(id));
    knownIds.current = ids;

    setSelectedId((prev) => {
      if (added.length > 0) return added[added.length - 1];
      if (prev !== null && ids.includes(prev)) return prev;
      return ids[0] ?? null;
    });
  }, [task.attachments]);

  async function handleUpload(picked: File[]) {
    const room = limits.max_files_per_task - task.attachments.length;
    const { accepted, rejected } = splitBySize(picked.slice(0, Math.max(room, 0)), limits);

    const messages = [...rejected];
    if (picked.length > Math.max(room, 0)) {
      messages.push(`Ліміт ${limits.max_files_per_task} файлів на задачу вичерпано`);
    }
    onReject(messages);
    if (accepted.length === 0) return;

    setBusy(true);
    setProgress(0);
    try {
      await onUploadFiles(task.id, accepted, setProgress);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleDeleteFile(id: number, name: string) {
    if (!window.confirm(`Видалити файл «${name}»?`)) return;
    setBusy(true);
    try {
      await onDeleteFile(id);
    } finally {
      setBusy(false);
    }
  }

  async function saveRename() {
    if (!selected || !draftName.trim()) return;
    setBusy(true);
    try {
      await onRenameFile(selected.id, draftName.trim());
      setRenaming(false);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: TaskStatus) {
    setBusy(true);
    try {
      await onUpdate(task.id, { status });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={task.title}>
        <header className="modal-head">
          <div className="modal-head-text">
            <h2 className="modal-title">{task.title}</h2>
            <div className="task-meta" style={{ marginTop: 8 }}>
              <span className={`badge ${task.status}`}>{STATUS_LABELS[task.status]}</span>
              <span className="badge date">{formatDate(task.due_date)}</span>
              {task.due_date && (
                <span className={`badge ${overdue ? "overdue" : "date"}`}>
                  {deadlineLabel(task.due_date)}
                </span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрити">
            ×
          </button>
        </header>

        <div className="modal-body">
          <aside className="modal-side">
            <div className="side-block">
              <div className="side-label">Опис</div>
              {task.description ? (
                <p className="side-text">
                  <LinkifiedText text={task.description} />
                </p>
              ) : (
                <p className="side-text muted">Опису немає</p>
              )}
            </div>

            <div className="side-block">
              <div className="side-label">Статус</div>
              <select
                className="select"
                value={task.status}
                onChange={(e) => changeStatus(e.target.value as TaskStatus)}
                disabled={busy}
              >
                {STATUS_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="side-block">
              <div className="side-label">
                Файли ({task.attachments.length}/{limits.max_files_per_task})
              </div>

              {task.attachments.length === 0 ? (
                <p className="side-text muted">Ще нічого не прикріплено</p>
              ) : (
                <ul className="file-picker">
                  {task.attachments.map((file) => (
                    <li key={file.id}>
                      <button
                        className={`file-pick ${file.id === selectedId ? "active" : ""}`}
                        onClick={() => {
                          setSelectedId(file.id);
                          setRenaming(false);
                        }}
                      >
                        {file.preview === "image" ? (
                          <img className="file-thumb" src={attachmentViewUrl(file)} alt="" />
                        ) : (
                          <span className="file-kind" aria-hidden>
                            {FILE_KINDS[file.preview ?? ""] ?? "FILE"}
                          </span>
                        )}
                        <span className="file-pick-name">{file.filename}</span>
                        <span className="file-size">{formatSize(file.size)}</span>
                      </button>
                      <button
                        className="file-remove"
                        onClick={() => handleDeleteFile(file.id, file.filename)}
                        disabled={busy}
                        aria-label={`Видалити ${file.filename}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ marginTop: 16 }}>
                <FileDropzone
                  onFiles={handleUpload}
                  disabled={busy}
                  compact
                  label={busy ? "Зачекайте..." : "Додати файл або перетягнути сюди"}
                />
              </div>
              <UploadProgress percent={progress} />
            </div>

            <div className="side-block side-dates">
              <div>Створено: {new Date(task.created_at).toLocaleString("uk-UA")}</div>
              <div>Оновлено: {new Date(task.updated_at).toLocaleString("uk-UA")}</div>
            </div>
          </aside>

          <section className="modal-main">
            {selected && (
              <div className="preview-bar">
                {renaming ? (
                  <>
                    <input
                      className="input rename-input"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveRename();
                        if (e.key === "Escape") setRenaming(false);
                      }}
                      maxLength={255}
                      autoFocus
                    />
                    <div className="preview-bar-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={saveRename}
                        disabled={busy || !draftName.trim()}
                      >
                        Зберегти
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(false)}>
                        Скасувати
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="preview-name">{selected.filename}</span>
                    <span className="file-size">{formatSize(selected.size)}</span>
                    <div className="preview-bar-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setDraftName(selected.filename);
                          setRenaming(true);
                        }}
                        disabled={busy}
                      >
                        Перейменувати
                      </button>
                      <a
                        className="btn btn-ghost btn-sm"
                        href={attachmentViewUrl(selected)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Відкрити у вкладці
                      </a>
                      <a className="btn btn-ghost btn-sm" href={attachmentUrl(selected)} download>
                        Завантажити
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="preview-body">
              <FilePreview file={selected} textLimit={limits.text_preview_limit} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
