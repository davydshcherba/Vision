"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/components/LanguageProvider";
import { attachmentUrl, attachmentViewUrl, fetchAttachmentText } from "@/lib/api";
import { formatSize } from "@/lib/format";
import type { Attachment } from "@/lib/types";

interface Props {
  file: Attachment | null;
  textLimit: number;
}

export default function FilePreview({ file, textLimit }: Props) {
  const { lang, t } = useI18n();
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
      .catch((err) => !cancelled && setTextError(err instanceof Error ? err.message : t.common.error));

    return () => {
      cancelled = true;
    };
  }, [file, textLimit, t]);

  if (!file) {
    return (
      <div className="preview-empty">
        <span className="preview-empty-kicker">{t.preview.kicker}</span>
        <strong>{t.preview.noFiles}</strong>
        {t.preview.noFilesHint}
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
      return <div className="preview-empty">{t.common.loading}</div>;
    }
    return (
      <div className="preview-scroll">
        {truncated && (
          <div className="preview-notice">
            {t.preview.truncated(formatSize(textLimit, lang), formatSize(file.size, lang))}
          </div>
        )}
        <pre className="preview-text">{text}</pre>
      </div>
    );
  }

  return (
    <div className="preview-empty">
      <span className="preview-empty-kicker">{file.filename.includes(".") ? file.filename.split(".").pop() : t.preview.file}</span>
      <strong>{t.preview.unsupported}</strong>
      {file.filename} · {formatSize(file.size, lang)}
      <a className="btn btn-primary" href={attachmentUrl(file)} download style={{ marginTop: 20 }}>
        {t.preview.downloadFile}
      </a>
    </div>
  );
}
