import type {
  Attachment,
  Limits,
  Stats,
  Task,
  TaskInput,
  TaskStatus,
  UploadResult,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init });

  if (!response.ok) {
    let message = `Помилка ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) {
        message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // тіло не JSON — залишаємо загальне повідомлення
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

const jsonHeaders = { "Content-Type": "application/json" };

/* ---------- Задачі ---------- */

export function listTasks(filters: { status?: TaskStatus | "all"; q?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  const query = params.toString();
  return request<Task[]>(`/api/tasks${query ? `?${query}` : ""}`);
}

export function getStats() {
  return request<Stats>("/api/stats");
}

export function getLimits() {
  return request<Limits>("/api/limits");
}

export function createTask(data: TaskInput) {
  return request<Task>("/api/tasks", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(data),
  });
}

export function updateTask(id: number, data: Partial<TaskInput>) {
  return request<Task>(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(data),
  });
}

export function deleteTask(id: number) {
  return request<void>(`/api/tasks/${id}`, { method: "DELETE" });
}

/* ---------- Файли ---------- */

/**
 * Завантаження через XMLHttpRequest, а не fetch: лише так можна показати
 * прогрес — fetch не віддає подій про відправлене тіло запиту.
 */
export function uploadAttachments(
  taskId: number,
  files: FileList | File[],
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const form = new FormData();
  Array.from(files).forEach((file) => form.append("files", file));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/tasks/${taskId}/attachments`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // не JSON — нижче віддамо загальну помилку
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadResult);
        return;
      }

      const detail = (body as { detail?: unknown } | null)?.detail;
      reject(new Error(typeof detail === "string" ? detail : `Помилка ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Не вдалося зʼєднатися з сервером"));
    xhr.onabort = () => reject(new Error("Завантаження скасовано"));

    xhr.send(form);
  });
}

export function renameAttachment(id: number, filename: string) {
  return request<Attachment>(`/api/attachments/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ filename }),
  });
}

export function deleteAttachment(id: number) {
  return request<void>(`/api/attachments/${id}`, { method: "DELETE" });
}

export function attachmentUrl(attachment: Attachment) {
  return `${API_URL}${attachment.download_url}`;
}

/** Той самий файл, але віддається inline — для перегляду в сторінці. */
export function attachmentViewUrl(attachment: Attachment) {
  return `${API_URL}${attachment.view_url}`;
}

export interface TextContent {
  text: string;
  truncated: boolean;
}

/**
 * Читає текстовий файл для перегляду. Великі файли беремо частково
 * (Range-запитом), інакше 20 МБ логу підвісять вкладку.
 */
export async function fetchAttachmentText(
  attachment: Attachment,
  maxBytes: number,
): Promise<TextContent> {
  const truncated = attachment.size > maxBytes;
  const response = await fetch(attachmentViewUrl(attachment), {
    cache: "no-store",
    headers: truncated ? { Range: `bytes=0-${maxBytes - 1}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Не вдалося прочитати файл (${response.status})`);
  }

  return { text: decodeText(await response.arrayBuffer(), truncated), truncated };
}

function decodeText(buffer: ArrayBuffer, truncated: boolean): string {
  const bytes = new Uint8Array(buffer);

  // Якщо обрізали посеред багатобайтового символу — відкидаємо хвіст
  for (const cut of truncated ? [0, 1, 2, 3] : [0]) {
    try {
      const slice = cut === 0 ? bytes : bytes.subarray(0, bytes.length - cut);
      return new TextDecoder("utf-8", { fatal: true }).decode(slice);
    } catch {
      // не склалось — пробуємо коротший хвіст
    }
  }

  // Не UTF-8: найімовірніше кирилиця у windows-1251
  return new TextDecoder("windows-1251").decode(bytes);
}
