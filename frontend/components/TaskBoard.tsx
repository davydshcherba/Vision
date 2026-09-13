"use client";

import { useState, type CSSProperties, type DragEvent } from "react";

import TaskCard from "@/components/TaskCard";
import { daysLeft } from "@/lib/format";
import {
  STATUS_LABELS,
  type Limits,
  type Task,
  type TaskInput,
  type TaskStatus,
} from "@/lib/types";

const EMPTY_HINTS: Record<TaskStatus, string> = {
  todo: "Нічого не чекає",
  in_progress: "Нічого в роботі",
  done: "Ще нічого не завершено",
};

/** Спершу найближчий дедлайн; без дати — в кінці, серед рівних новіші вище. */
function byDeadline(a: Task, b: Task): number {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return b.id - a.id;
}

function isOverdue(task: Task): boolean {
  const days = daysLeft(task.due_date);
  return task.status !== "done" && days !== null && days < 0;
}

interface Props {
  tasks: Task[];
  columns: TaskStatus[];
  limits: Limits;
  onUpdate: (id: number, data: Partial<TaskInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUploadFiles: (id: number, files: File[], onProgress: (percent: number) => void) => Promise<void>;
  onOpen: (taskId: number, attachmentId?: number) => void;
  onReject: (messages: string[]) => void;
}

export default function TaskBoard({ tasks, columns, ...card }: Props) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  /** Реагуємо лише на перетягування картки — файли летять далі, до картки. */
  function allowDrop(status: TaskStatus, event: DragEvent) {
    if (draggedId === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOverColumn(status);
  }

  function drop(status: TaskStatus, event: DragEvent) {
    if (draggedId === null) return;
    event.preventDefault();
    setOverColumn(null);

    const task = tasks.find((item) => item.id === draggedId);
    setDraggedId(null);
    if (task && task.status !== status) {
      void card.onUpdate(task.id, { status });
    }
  }

  return (
    <div className="board" style={{ "--columns": columns.length } as CSSProperties}>
      {columns.map((status) => {
        const items = tasks.filter((task) => task.status === status).sort(byDeadline);
        const late = items.filter(isOverdue).length;

        return (
          <section
            key={status}
            className={`column column-${status}${overColumn === status ? " over" : ""}`}
            onDragOver={(event) => allowDrop(status, event)}
            onDragLeave={(event) => {
              // Перехід на дочірній елемент — ще не вихід із колонки
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              setOverColumn((current) => (current === status ? null : current));
            }}
            onDrop={(event) => drop(status, event)}
          >
            <header className="column-head">
              <span className="column-dot" aria-hidden />
              <h2 className="column-title">{STATUS_LABELS[status]}</h2>
              <span className="column-count">{items.length}</span>
              {late > 0 && (
                <span className="column-late" title="Прострочені задачі">
                  {late} прострочено
                </span>
              )}
            </header>

            <div className="column-body">
              {items.length === 0 ? (
                <p className="column-empty">{EMPTY_HINTS[status]}</p>
              ) : (
                items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dragging={draggedId === task.id}
                    onDragStart={() => setDraggedId(task.id)}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setOverColumn(null);
                    }}
                    {...card}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
