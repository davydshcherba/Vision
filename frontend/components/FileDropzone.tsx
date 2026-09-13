"use client";

import { useRef, useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
}

export default function FileDropzone({ onFiles, label, hint, disabled, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  // Лічильник, щоб підсвітка не блимала при переході над дочірніми елементами
  const depth = useRef(0);

  function pick(list: FileList | null) {
    if (!list || list.length === 0) return;
    // Копіюємо ДО скидання value: FileList — живий обʼєкт інпута
    const files = Array.from(list);
    if (inputRef.current) inputRef.current.value = "";
    onFiles(files);
  }

  return (
    <>
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => pick(e.target.files)} />
      <button
        type="button"
        className={`dropzone${compact ? " compact" : ""}${over ? " over" : ""}`}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          setOver(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current -= 1;
          if (depth.current <= 0) {
            depth.current = 0;
            setOver(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          depth.current = 0;
          setOver(false);
          if (!disabled) pick(event.dataTransfer.files);
        }}
      >
        <span className="dropzone-label">{label}</span>
        {hint && <span className="dropzone-hint">{hint}</span>}
      </button>
    </>
  );
}
