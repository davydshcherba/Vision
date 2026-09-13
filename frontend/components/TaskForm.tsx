"use client";

import { useState } from "react";

import FileDropzone from "@/components/FileDropzone";
import { useI18n } from "@/components/LanguageProvider";
import UploadProgress from "@/components/UploadProgress";
import { splitBySize } from "@/lib/files";
import { formatSize } from "@/lib/format";
import { STATUS_ORDER, type Limits, type TaskInput, type TaskStatus } from "@/lib/types";

interface Props {
  limits: Limits;
  onSubmit: (data: TaskInput, files: File[], onProgress: (percent: number) => void) => Promise<void>;
  onCancel: () => void;
}

export default function TaskForm({ limits, onSubmit, onCancel }: Props) {
  const { lang, t } = useI18n();
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
    const { accepted, rejected: tooBig } = splitBySize(picked.slice(0, Math.max(room, 0)), limits, lang);

    const overflow = picked.length - Math.max(room, 0);
    const messages = [...tooBig];
    if (overflow > 0) {
      messages.push(t.form.tooMany(limits.max_files_per_task));
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
          <label htmlFor="title">{t.form.title}</label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.form.titlePlaceholder}
            maxLength={200}
            autoFocus
            required
          />
        </div>

        <div className="field">
          <label htmlFor="description">{t.common.description}</label>
          <textarea
            id="description"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.form.descriptionPlaceholder}
          />
        </div>

        <div className="row-2">
          <div className="field">
            <label htmlFor="due">{t.common.dueDate}</label>
            <input
              id="due"
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="status">{t.common.status}</label>
            <select
              id="status"
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {t.status[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>{t.common.files}</label>
          <FileDropzone
            onFiles={addFiles}
            disabled={saving}
            label={t.form.dropLabel}
            hint={t.form.dropHint(formatSize(limits.max_upload_size, lang), limits.max_files_per_task)}
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
                  {file.name} · {formatSize(file.size, lang)}
                  <button
                    type="button"
                    className="file-remove"
                    onClick={() => removeFile(index)}
                    aria-label={t.form.removeLabel(file.name)}
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
            {saving ? t.form.saving : t.form.create}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={saving}>
            {t.common.cancel}
          </button>
        </div>
      </div>
    </form>
  );
}
