import type { TaskStatus } from "./types";

export type Lang = "uk" | "en";

export const LANGS: { value: Lang; label: string }[] = [
  { value: "uk", label: "UA" },
  { value: "en", label: "EN" },
];

export const DEFAULT_LANG: Lang = "uk";

export function isLang(value: unknown): value is Lang {
  return value === "uk" || value === "en";
}

/** Ukrainian plural forms: 1 задача, 2 задачі, 5 задач. */
function ukPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const uk = {
  locale: "uk-UA",
  title: "Дашборд задач студента",
  status: {
    todo: "До виконання",
    in_progress: "В роботі",
    done: "Виконано",
  } as Record<TaskStatus, string>,
  common: {
    save: "Зберегти",
    cancel: "Скасувати",
    close: "Закрити",
    loading: "Завантаження...",
    unknownError: "Невідома помилка",
    error: "Помилка",
    download: "Завантажити",
    files: "Файли",
    description: "Опис",
    status: "Статус",
    dueDate: "Дата виконання",
  },
  page: {
    eyebrow: "Дашборд студента",
    taskCount: (n: number) => `${n} ${ukPlural(n, "задача", "задачі", "задач")}`,
    language: "Мова",
    titleStart: "Мої",
    titleAccent: "задачі",
    subtitle: "Перетягуй картки між колонками — у кожній спершу найближчі дедлайни.",
    newTask: "Нова задача",
    closeForm: "Закрити форму",
    backendDown: (message: string, url: string) => `${message}. Перевір, чи запущений бекенд на ${url}`,
    notAllFiles: "Не всі файли додано:",
    allBoard: "Уся дошка",
    search: "Пошук за назвою або описом...",
    nothingFound: "Нічого не знайдено",
    noTasks: "Задач поки немає",
    tryFilter: "Спробуй змінити фільтр або пошуковий запит.",
    addFirst: "Натисни «Нова задача», щоб додати перше завдання.",
  },
  stats: {
    total: "Усього задач",
    todo: "До виконання",
    in_progress: "В роботі",
    done: "Виконано",
    overdue: "Прострочено",
  },
  board: {
    empty: {
      todo: "Нічого не чекає",
      in_progress: "Нічого в роботі",
      done: "Ще нічого не завершено",
    } as Record<TaskStatus, string>,
    overdueTitle: "Прострочені задачі",
    overdueCount: (n: number) => `${n} прострочено`,
  },
  card: {
    title: "Назва",
    confirmDelete: (title: string) => `Видалити задачу «${title}» разом з файлами?`,
    moveTitle: (status: string) => `Перенести: ${status}`,
    moveLabel: (status: string) => `Перенести в «${status}»`,
    leftColumn: "Ліва колонка",
    rightColumn: "Права колонка",
    filesLabel: (n: number) => `Файли задачі (${n})`,
    edit: "Змінити",
    editLabel: "Змінити задачу",
    delete: "Видалити",
    deleteLabel: "Видалити задачу",
  },
  detail: {
    noDescription: "Опису немає",
    nothingAttached: "Ще нічого не прикріплено",
    deleteFileLabel: (name: string) => `Видалити ${name}`,
    confirmDeleteFile: (name: string) => `Видалити файл «${name}»?`,
    fileLimit: (n: number) => `Ліміт ${n} файлів на задачу вичерпано`,
    wait: "Зачекайте...",
    addFile: "Додати файл або перетягнути сюди",
    created: "Створено",
    updated: "Оновлено",
    rename: "Перейменувати",
    openInTab: "Відкрити у вкладці",
  },
  form: {
    title: "Назва задачі *",
    titlePlaceholder: "Наприклад: Лабораторна №4 з фізики",
    descriptionPlaceholder: "Що саме треба зробити, вимоги викладача, посилання...",
    dropLabel: "Перетягни файли сюди або натисни, щоб вибрати",
    dropHint: (size: string, n: number) => `До ${size} на файл, максимум ${n} шт.`,
    tooMany: (n: number) => `Більше ніж ${n} файлів на задачу не можна`,
    removeLabel: (name: string) => `Прибрати ${name}`,
    saving: "Зберігаю...",
    create: "Створити задачу",
  },
  preview: {
    kicker: "Попередній перегляд",
    noFiles: "Файлів поки немає",
    noFilesHint: "Прикріпи PDF, картинку чи конспект — тут його можна буде одразу переглянути.",
    truncated: (shown: string, total: string) =>
      `Показані перші ${shown} з ${total} — щоб побачити все, завантаж файл.`,
    file: "Файл",
    unsupported: "Цей формат не показується в браузері",
    downloadFile: "Завантажити файл",
  },
  upload: {
    progress: (percent: number) => `Завантаження ${percent}%`,
    processing: "Обробка на сервері...",
  },
  files: {
    tooBig: (name: string, size: string, limit: string) => `${name}: ${size} — більше за ліміт ${limit}`,
    empty: (name: string) => `${name}: порожній файл`,
  },
  api: {
    status: (code: number) => `Помилка ${code}`,
    network: "Не вдалося зʼєднатися з сервером",
    aborted: "Завантаження скасовано",
    readFailed: (code: number) => `Не вдалося прочитати файл (${code})`,
  },
  format: {
    months: [
      "січня", "лютого", "березня", "квітня", "травня", "червня",
      "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
    ],
    noDeadline: "Без дедлайну",
    today: "Сьогодні",
    tomorrow: "Завтра",
    yesterday: "Вчора",
    overdueBy: (days: number) => `Прострочено на ${days} дн.`,
    inDays: (days: number) => `Через ${days} дн.`,
    sizeUnits: ["Б", "КБ", "МБ"],
  },
};

export type Dictionary = typeof uk;

const en: Dictionary = {
  locale: "en-GB",
  title: "Student Task Dashboard",
  status: {
    todo: "To do",
    in_progress: "In progress",
    done: "Done",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    loading: "Loading...",
    unknownError: "Unknown error",
    error: "Error",
    download: "Download",
    files: "Files",
    description: "Description",
    status: "Status",
    dueDate: "Due date",
  },
  page: {
    eyebrow: "Student dashboard",
    taskCount: (n) => `${n} ${n === 1 ? "task" : "tasks"}`,
    language: "Language",
    titleStart: "My",
    titleAccent: "tasks",
    subtitle: "Drag cards between columns — each one shows the nearest deadlines first.",
    newTask: "New task",
    closeForm: "Close form",
    backendDown: (message, url) => `${message}. Check that the backend is running at ${url}`,
    notAllFiles: "Not all files were added:",
    allBoard: "Whole board",
    search: "Search by title or description...",
    nothingFound: "Nothing found",
    noTasks: "No tasks yet",
    tryFilter: "Try changing the filter or the search query.",
    addFirst: "Click “New task” to add your first assignment.",
  },
  stats: {
    total: "Total tasks",
    todo: "To do",
    in_progress: "In progress",
    done: "Done",
    overdue: "Overdue",
  },
  board: {
    empty: {
      todo: "Nothing waiting",
      in_progress: "Nothing in progress",
      done: "Nothing finished yet",
    },
    overdueTitle: "Overdue tasks",
    overdueCount: (n) => `${n} overdue`,
  },
  card: {
    title: "Title",
    confirmDelete: (title) => `Delete the task “${title}” together with its files?`,
    moveTitle: (status) => `Move to: ${status}`,
    moveLabel: (status) => `Move to “${status}”`,
    leftColumn: "Left column",
    rightColumn: "Right column",
    filesLabel: (n) => `Task files (${n})`,
    edit: "Edit",
    editLabel: "Edit task",
    delete: "Delete",
    deleteLabel: "Delete task",
  },
  detail: {
    noDescription: "No description",
    nothingAttached: "Nothing attached yet",
    deleteFileLabel: (name) => `Delete ${name}`,
    confirmDeleteFile: (name) => `Delete the file “${name}”?`,
    fileLimit: (n) => `The limit of ${n} files per task has been reached`,
    wait: "Please wait...",
    addFile: "Add a file or drop it here",
    created: "Created",
    updated: "Updated",
    rename: "Rename",
    openInTab: "Open in a tab",
  },
  form: {
    title: "Task title *",
    titlePlaceholder: "For example: Physics lab #4",
    descriptionPlaceholder: "What exactly needs to be done, teacher's requirements, links...",
    dropLabel: "Drop files here or click to choose",
    dropHint: (size, n) => `Up to ${size} per file, ${n} files max.`,
    tooMany: (n) => `A task can't have more than ${n} files`,
    removeLabel: (name) => `Remove ${name}`,
    saving: "Saving...",
    create: "Create task",
  },
  preview: {
    kicker: "Preview",
    noFiles: "No files yet",
    noFilesHint: "Attach a PDF, an image or your notes — you'll be able to view it right here.",
    truncated: (shown, total) => `Showing the first ${shown} of ${total} — download the file to see all of it.`,
    file: "File",
    unsupported: "This format can't be shown in the browser",
    downloadFile: "Download file",
  },
  upload: {
    progress: (percent) => `Uploading ${percent}%`,
    processing: "Processing on the server...",
  },
  files: {
    tooBig: (name, size, limit) => `${name}: ${size} — over the ${limit} limit`,
    empty: (name) => `${name}: empty file`,
  },
  api: {
    status: (code) => `Error ${code}`,
    network: "Could not connect to the server",
    aborted: "Upload cancelled",
    readFailed: (code) => `Could not read the file (${code})`,
  },
  format: {
    months: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    noDeadline: "No deadline",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",
    overdueBy: (days) => `${days} days overdue`,
    inDays: (days) => `In ${days} days`,
    sizeUnits: ["B", "KB", "MB"],
  },
};

export const dictionaries: Record<Lang, Dictionary> = { uk, en };
