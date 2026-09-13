"use client";

import { useI18n } from "@/components/LanguageProvider";

export default function UploadProgress({ percent }: { percent: number | null }) {
  const { t } = useI18n();
  if (percent === null) return null;

  return (
    <div className="upload-progress">
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-bar" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-text">
        {percent < 100 ? t.upload.progress(percent) : t.upload.processing}
      </span>
    </div>
  );
}
