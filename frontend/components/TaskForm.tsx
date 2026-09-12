"use client";

import { useState } from "react";

import FileDropzone from "@/components/FileDropzone";
import UploadProgress from "@/components/UploadProgress";
import { splitBySize } from "@/lib/files";
import { formatSize } from "@/lib/format";
import { STATUS_LABELS, STATUS_ORDER, type Limits, type TaskInput, type TaskStatus } from "@/lib/types";

interface Props {
  limits: Limits;
  onSubmit: (data: TaskInput, files: File[], onProgress: (percent: number) => void) => Promise<void>;
  onCancel: () => void;
}

export default function TaskForm({ limits, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [files, setFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  function addFiles(picked: File[]) {
    const room = limits.max_files_per_task - files.length;
    const { accepted, rejected: tooBig } = splitBySize(picked.slice(0, Math.max(room, 0)), limits);

    const overflow = picked.length - Math.max(room, 0);
    const messages = [...tooBig];
    if (overflow > 0) {
      messages.push(`Більше ніж ${limits.max_files_per_task} файлів на задачу не можна`);
    }

    setRejected(messages);
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    setProgress(files.length > 0 ? 0 : null);
    try {
      await onSubmit(
        {
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          status,
        },
        files,
        setProgress,
      );
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="title">Назва задачі *</label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Наприклад: Лабораторна №4 з фізики"
            maxLength={200}
            autoFocus
            required
          />
        </div>

        <div className="field">
          <label htmlFor="description">Опис</label>
          <textarea
            id="description"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Що саме треба зробити, вимоги викладача, посилання..."
          />
        </div>

        <div className="row-2">
          <div className="field">
            <label htmlFor="due">Дата виконання</label>
            <input
              id="due"
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="status">Статус</label>
            <select
              id="status"
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Файли</label>
          <FileDropzone
            onFiles={addFiles}
            disabled={saving}
            label="Перетягни файли сюди або натисни, щоб вибрати"
            hint={`До ${formatSize(limits.max_upload_size)} на файл, максимум ${limits.max_files_per_task} шт.`}
          />

          {rejected.length > 0 && (
            <ul className="reject-list">
              {rejected.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          {files.length > 0 && (
            <div className="chips">
              {files.map((file, index) => (
                <span className="chip" key={`${file.name}-${index}`}>
                  {file.name} · {formatSize(file.size)}
                  <button
                    type="button"
                    className="file-remove"
                    onClick={() => removeFile(index)}
                    aria-label={`Прибрати ${file.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <UploadProgress percent={progress} />
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving || !title.trim()}>
            {saving ? "Зберігаю..." : "Створити задачу"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={saving}>
            Скасувати
          </button>
        </div>
      </div>
    </form>
  );
}
