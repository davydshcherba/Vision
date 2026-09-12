import { formatSize } from "./format";
import type { Limits } from "./types";

export interface SplitResult {
  accepted: File[];
  rejected: string[];
}

/**
 * Відсіює завеликі файли ще до відправки — інакше 20 МБ спершу
 * проїдуть по мережі й аж потім отримають 413.
 */
export function splitBySize(files: File[], limits: Limits): SplitResult {
  const accepted: File[] = [];
  const rejected: string[] = [];

  for (const file of files) {
    if (file.size > limits.max_upload_size) {
      rejected.push(
        `${file.name}: ${formatSize(file.size)} — більше за ліміт ${formatSize(limits.max_upload_size)}`,
      );
    } else if (file.size === 0) {
      rejected.push(`${file.name}: порожній файл`);
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}
