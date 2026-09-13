import type {
  Attachment,
  Limits,
  Stats,
  Task,
  TaskInput,
  TaskStatus,
  UploadResult,
} from "./types";
import { DEFAULT_LANG, dictionaries, type Lang } from "./i18n";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// * The backend localizes its error messages by Accept-Language
let language: Lang = DEFAULT_LANG;

export function setApiLanguage(lang: Lang) {
  language = lang;
}

function messages() {
  return dictionaries[language].api;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Accept-Language": language, ...init?.headers },
  });

  if (!response.ok) {
    let message = messages().status(response.status);
    try {
      const body = await response.json();
      if (body?.detail) {
        message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // * body is not JSON — keep the generic message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

const jsonHeaders = { "Content-Type": "application/json" };

/* ---------- Tasks ---------- */

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

/* ---------- Files ---------- */

/**
 * Upload via XMLHttpRequest rather than fetch: it's the only way to show
 * progress — fetch emits no events for the sent request body.
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
    xhr.setRequestHeader("Accept-Language", language);

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
        // * not JSON — the generic error is returned below
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadResult);
        return;
      }

      const detail = (body as { detail?: unknown } | null)?.detail;
      reject(new Error(typeof detail === "string" ? detail : messages().status(xhr.status)));
    };

    xhr.onerror = () => reject(new Error(messages().network));
    xhr.onabort = () => reject(new Error(messages().aborted));

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

/** The same file, but served inline — for viewing in the page. */
export function attachmentViewUrl(attachment: Attachment) {
  return `${API_URL}${attachment.view_url}`;
}

export interface TextContent {
  text: string;
  truncated: boolean;
}

/**
 * Reads a text file for preview. Large files are fetched partially
 * (with a Range request), otherwise a 20 MB log would freeze the tab.
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
    throw new Error(messages().readFailed(response.status));
  }

  return { text: decodeText(await response.arrayBuffer(), truncated), truncated };
}

function decodeText(buffer: ArrayBuffer, truncated: boolean): string {
  const bytes = new Uint8Array(buffer);

  // ! If cut in the middle of a multibyte character — drop the tail
  for (const cut of truncated ? [0, 1, 2, 3] : [0]) {
    try {
      const slice = cut === 0 ? bytes : bytes.subarray(0, bytes.length - cut);
      return new TextDecoder("utf-8", { fatal: true }).decode(slice);
    } catch {
      // * didn't work — try a shorter tail
    }
  }

  // * Not UTF-8: most likely Cyrillic in windows-1251
  return new TextDecoder("windows-1251").decode(bytes);
}
