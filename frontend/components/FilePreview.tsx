"use client";

import { useEffect, useState } from "react";

import { attachmentUrl, attachmentViewUrl, fetchAttachmentText } from "@/lib/api";
import { formatSize } from "@/lib/format";
import type { Attachment } from "@/lib/types";

interface Props {
  file: Attachment | null;
  textLimit: number;
}

export default function FilePreview({ file, textLimit }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    if (!file || file.preview !== "text") {
      setText(null);
      setTextError(null);
      setTruncated(false);
      return;
    }

    let cancelled = false;
    setText(null);
    setTextError(null);

    fetchAttachmentText(file, textLimit)
      .then((content) => {
        if (cancelled) return;
        setText(content.text);
        setTruncated(content.truncated);
      })
      .catch((err) => !cancelled && setTextError(err instanceof Error ? err.message : "Помилка"));

    return () => {
      cancelled = true;
    };
  }, [file, textLimit]);

  if (!file) {
    return (
      <div className="preview-empty">
        <span className="preview-empty-kicker">Попередній перегляд</span>
        <strong>Файлів поки немає</strong>
        Прикріпи PDF, картинку чи конспект — тут його можна буде одразу переглянути.
      </div>
    );
  }

  if (file.preview === "pdf") {
    return (
      <iframe
        key={file.id}
        className="preview-frame"
        src={attachmentViewUrl(file)}
        title={file.filename}
      />
    );
  }

  if (file.preview === "image") {
    return (
      <div className="preview-scroll preview-center">
        <img className="preview-image" src={attachmentViewUrl(file)} alt={file.filename} />
      </div>
    );
  }

  if (file.preview === "text") {
    if (textError) {
      return <div className="preview-empty">{textError}</div>;
    }
    if (text === null) {
      return <div className="preview-empty">Завантаження...</div>;
    }
    return (
      <div className="preview-scroll">
        {truncated && (
          <div className="preview-notice">
            Показані перші {formatSize(textLimit)} з {formatSize(file.size)} — щоб побачити все,
            завантаж файл.
          </div>
        )}
        <pre className="preview-text">{text}</pre>
      </div>
    );
  }

  return (
    <div className="preview-empty">
      <span className="preview-empty-kicker">{file.filename.includes(".") ? file.filename.split(".").pop() : "Файл"}</span>
      <strong>Цей формат не показується в браузері</strong>
      {file.filename} · {formatSize(file.size)}
      <a className="btn btn-primary" href={attachmentUrl(file)} download style={{ marginTop: 20 }}>
        Завантажити файл
      </a>
    </div>
  );
}
