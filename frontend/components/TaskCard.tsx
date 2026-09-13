"use client";

import { useState, type DragEvent } from "react";

import UploadProgress from "@/components/UploadProgress";
import { splitBySize } from "@/lib/files";
import { daysLeft, deadlineLabel, formatDateShort } from "@/lib/format";
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
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onUpdate: (id: number, data: Partial<TaskInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUploadFiles: (id: number, files: File[], onProgress: (percent: number) => void) => Promise<void>;
  onOpen: (taskId: number, attachmentId?: number) => void;
  onReject: (messages: string[]) => void;
}

/** Тягнуть файли, а не картку — таке перетягування картка обробляє сама. */
function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export default function TaskCard({
  task,
  limits,
  dragging,
  onDragStart,
  onDragEnd,
  onUpdate,
  onDelete,
  onUploadFiles,
  onOpen,
  onReject,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);

  const days = daysLeft(task.due_date);
  const overdue = task.status !== "done" && days !== null && days < 0;
  const dueSoon = task.status !== "done" && days !== null && days >= 0 && days <= 2;

  const index = STATUS_ORDER.indexOf(task.status);
  const previous = STATUS_ORDER[index - 1];
  const next = STATUS_ORDER[index + 1];

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

  const classes = ["task", `status-${task.status}`];
  if (overdue) classes.push("is-overdue");
  if (dragging) classes.push("dragging");
  if (fileOver) classes.push("file-over");

  return (
    <article
      className={classes.join(" ")}
      draggable={!editing && !busy}
      onDragStart={(event) => {
        // Firefox не почне перетягування, доки в dataTransfer порожньо
        event.dataTransfer.setData("text/plain", String(task.id));
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragEnter={(event) => {
        if (hasFiles(event)) setFileOver(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setFileOver(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return; // картку впіймає колонка
        event.preventDefault();
        event.stopPropagation();
        setFileOver(false);
        if (!busy) void handleUpload(Array.from(event.dataTransfer.files));
      }}
    >
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
            <button
              className="btn btn-primary btn-sm"
              onClick={saveEdits}
              disabled={busy || !title.trim()}
            >
              Зберегти
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Скасувати
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="task-top">
            <span className={`due ${overdue ? "late" : dueSoon ? "soon" : task.due_date ? "" : "none"}`}>
              <span aria-hidden>{overdue ? "⏰" : "📅"}</span>
              {formatDateShort(task.due_date)}
            </span>
            {task.due_date && task.status !== "done" && (
              <span className={`due-rel ${overdue ? "late" : dueSoon ? "soon" : ""}`}>
                {deadlineLabel(task.due_date)}
              </span>
            )}
          </div>

          <h3 className="task-title">
            <button className="task-title-btn" onClick={() => onOpen(task.id)}>
              {task.title}
            </button>
          </h3>

          {task.description && <p className="task-desc">{task.description}</p>}

          <div className="task-foot">
            <div className="task-move">
              <button
                className="icon-btn"
                onClick={() => changeStatus(previous)}
                disabled={busy || !previous}
                title={previous ? `Перенести: ${STATUS_LABELS[previous]}` : undefined}
                aria-label={previous ? `Перенести в «${STATUS_LABELS[previous]}»` : "Ліва колонка"}
              >
                ←
              </button>
              <button
                className="icon-btn"
                onClick={() => changeStatus(next)}
                disabled={busy || !next}
                title={next ? `Перенести: ${STATUS_LABELS[next]}` : undefined}
                aria-label={next ? `Перенести в «${STATUS_LABELS[next]}»` : "Права колонка"}
              >
                →
              </button>
            </div>

            <div className="task-tools">
              <button
                className="icon-btn"
                onClick={() => onOpen(task.id)}
                title="Файли задачі"
                aria-label={`Файли задачі (${task.attachments.length})`}
              >
                📎
                {task.attachments.length > 0 && (
                  <span className="icon-count">{task.attachments.length}</span>
                )}
              </button>
              <button
                className="icon-btn"
                onClick={startEditing}
                disabled={busy}
                title="Змінити"
                aria-label="Змінити задачу"
              >
                ✏️
              </button>
              <button
                className="icon-btn danger"
                onClick={handleDelete}
                disabled={busy}
                title="Видалити"
                aria-label="Видалити задачу"
              >
                🗑
              </button>
            </div>
          </div>

          <UploadProgress percent={progress} />
        </>
      )}
    </article>
  );
}
