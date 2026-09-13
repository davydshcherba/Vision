"use client";

export default function UploadProgress({ percent }: { percent: number | null }) {
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
        {percent < 100 ? `Завантаження ${percent}%` : "Обробка на сервері..."}
      </span>
    </div>
  );
}
