const MONTHS = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
];

export function formatDate(iso: string | null): string {
  if (!iso) return "Без дедлайну";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Те саме для картки: рік показуємо, лише якщо він не поточний. */
export function formatDateShort(iso: string | null): string {
  if (!iso) return "Без дедлайну";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const label = `${day} ${MONTHS[month - 1]}`;
  return year === new Date().getFullYear() ? label : `${label} ${year}`;
}

/** Скільки днів лишилось до дедлайну (0 — сьогодні, від'ємне — прострочено). */
export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${iso}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function deadlineLabel(iso: string | null): string {
  const days = daysLeft(iso);
  if (days === null) return "Без дедлайну";
  if (days === 0) return "Сьогодні";
  if (days === 1) return "Завтра";
  if (days === -1) return "Вчора";
  if (days < 0) return `Прострочено на ${Math.abs(days)} дн.`;
  return `Через ${days} дн.`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
