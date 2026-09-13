import { formatSize } from "./format";
import { dictionaries, type Lang } from "./i18n";
import type { Limits } from "./types";

export interface SplitResult {
  accepted: File[];
  rejected: string[];
}

/**
 * Filters out oversized files before sending — otherwise 20 MB would first
 * travel over the network and only then get a 413.
 */
export function splitBySize(files: File[], limits: Limits, lang: Lang): SplitResult {
  const t = dictionaries[lang].files;
  const accepted: File[] = [];
  const rejected: string[] = [];

  for (const file of files) {
    if (file.size > limits.max_upload_size) {
      rejected.push(t.tooBig(file.name, formatSize(file.size, lang), formatSize(limits.max_upload_size, lang)));
    } else if (file.size === 0) {
      rejected.push(t.empty(file.name));
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}
