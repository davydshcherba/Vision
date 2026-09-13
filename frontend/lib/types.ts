export type TaskStatus = "todo" | "in_progress" | "done";

export type PreviewKind = "pdf" | "image" | "text";

export interface Attachment {
  id: number;
  filename: string;
  content_type: string | null;
  size: number;
  created_at: string;
  download_url: string;
  view_url: string;
  /** null means it can't be shown, download only */
  preview: PreviewKind | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
}

export interface UploadError {
  filename: string;
  error: string;
}

export interface UploadResult {
  uploaded: Attachment[];
  failed: UploadError[];
}

export interface Limits {
  max_upload_size: number;
  max_files_per_task: number;
  max_task_storage: number;
  text_preview_limit: number;
}

/** Used until the limits arrive from the server. */
export const DEFAULT_LIMITS: Limits = {
  max_upload_size: 20 * 1024 * 1024,
  max_files_per_task: 20,
  max_task_storage: 100 * 1024 * 1024,
  text_preview_limit: 200 * 1024,
};

export interface Stats {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  due_date?: string | null;
  status?: TaskStatus;
}

export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];
