"use client";

import { useState } from "react";

import FileDropzone from "@/components/FileDropzone";
import UploadProgress from "@/components/UploadProgress";
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

const FILE_ICONS: Record<string, string> = { pdf: "📕", image: "🖼️", text: "📝" };

interface Props {
  task: Task;
  limits: Limits;
  onUpdate: (id: number, data: Partial<TaskInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUploadFiles: (id: number, files: File[], onProgress: (percent: number) => void) => Promise<void>;
  onDeleteFile: (attachmentId: number) => Promise<void>;
  onOpen: (taskId: number, attachmentId?: number) => void;
  onReject: (messages: string[]) => void;
}

export default function TaskCard({
  task,
  limits,
  onUpdate,
  onDelete,
  onUploadFiles,
  onDeleteFile,
  onOpen,
  onReject,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const days = daysLeft(task.due_date);
  const overdue = task.status !== "done" && days !== null && days < 0;
  const dueSoon = task.status !== "done" && days !== null && days >= 0 && days <= 2;

  function startEditing() {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.due_date ?? "");
    setEditing(true);
  }

  async function saveEdits() {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
      });
      setEditing(false);
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

  async function handleDelete() {
    if (!window.confirm(`Видалити задачу «${task.title}» разом з файлами?`)) return;
    setBusy(true);
    try {
      await onDelete(task.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(picked: File[]) {
    const { accepted, rejected } = splitBySize(picked, limits);
    onReject(rejected);
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

  return (
    <article className={`task status-${task.status} ${overdue ? "is-overdue" : ""}`}>
      {editing ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`t-${task.id}`}>Назва</label>
            <input
              id={`t-${task.id}`}
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="field">
            <label htmlFor={`d-${task.id}`}>Опис</label>
            <textarea
              id={`d-${task.id}`}
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={`dd-${task.id}`}>Дата виконання</label>
            <input
              id={`dd-${task.id}`}
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" onClick={saveEdits} disabled={busy || !title.trim()}>
              Зберегти
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={busy}>
              Скасувати
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="task-head">
            <div>
              <h3 className="task-title">
                <button className="task-title-btn" onClick={() => onOpen(task.id)}>
                  {task.title}
                </button>
              </h3>
              {task.description && <p className="task-desc">{task.description}</p>}
            </div>
            <div className="task-actions">
              <select
                className="select btn-sm"
                style={{ width: "auto" }}
                value={task.status}
                onChange={(e) => changeStatus(e.target.value as TaskStatus)}
                disabled={busy}
                aria-label="Статус задачі"
              >
                {STATUS_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => onOpen(task.id)}>
                Переглянути
              </button>
              <button className="btn btn-ghost btn-sm" onClick={startEditing} disabled={busy}>
                Змінити
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={busy}>
                Видалити
              </button>
            </div>
          </div>

          <div className="task-meta">
            <span className={`badge ${task.status}`}>{STATUS_LABELS[task.status]}</span>
            <span className="badge date">📅 {formatDate(task.due_date)}</span>
            {task.due_date && (
              <span className={`badge ${overdue ? "overdue" : dueSoon ? "in_progress" : "date"}`}>
                {deadlineLabel(task.due_date)}
              </span>
            )}
          </div>
        </>
      )}

      <div className="files">
        <div className="files-title">
          Файли {task.attachments.length > 0 && `(${task.attachments.length})`}
        </div>

        {task.attachments.length > 0 && (
          <div className="file-list">
            {task.attachments.map((file) => (
              <div className="file" key={file.id}>
                <span aria-hidden>{FILE_ICONS[file.preview ?? ""] ?? "📎"}</span>
                <button className="file-open" onClick={() => onOpen(task.id, file.id)}>
                  {file.filename}
                </button>
                <span className="file-size">{formatSize(file.size)}</span>
                <button
                  className="file-remove"
                  onClick={() => handleDeleteFile(file.id, file.filename)}
                  disabled={busy}
                  aria-label={`Видалити ${file.filename}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <FileDropzone
          onFiles={handleUpload}
          disabled={busy}
          compact
          label={busy ? "Зачекайте..." : "Додати файл або перетягнути сюди"}
        />
        <UploadProgress percent={progress} />
      </div>
    </article>
  );
}
