import { dictionaries, type Lang } from "./i18n";

export function formatDate(iso: string | null, lang: Lang): string {
  const t = dictionaries[lang].format;
  if (!iso) return t.noDeadline;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day} ${t.months[month - 1]} ${year}`;
}

/** The same for a card: the year is shown only if it isn't the current one. */
export function formatDateShort(iso: string | null, lang: Lang): string {
  const t = dictionaries[lang].format;
  if (!iso) return t.noDeadline;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const label = `${day} ${t.months[month - 1]}`;
  return year === new Date().getFullYear() ? label : `${label} ${year}`;
}

/** Days left until the deadline (0 means today, negative means overdue). */
export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${iso}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function deadlineLabel(iso: string | null, lang: Lang): string {
  const t = dictionaries[lang].format;
  const days = daysLeft(iso);
  if (days === null) return t.noDeadline;
  if (days === 0) return t.today;
  if (days === 1) return t.tomorrow;
  if (days === -1) return t.yesterday;
  if (days < 0) return t.overdueBy(Math.abs(days));
  return t.inDays(days);
}

export function formatSize(bytes: number, lang: Lang): string {
  const [b, kb, mb] = dictionaries[lang].format.sizeUnits;
  if (bytes < 1024) return `${bytes} ${b}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${kb}`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${mb}`;
}
