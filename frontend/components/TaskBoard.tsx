"use client";

import { useState, type CSSProperties, type DragEvent } from "react";

import { useI18n } from "@/components/LanguageProvider";
import TaskCard from "@/components/TaskCard";
import { daysLeft } from "@/lib/format";
import type { Limits, Task, TaskInput, TaskStatus } from "@/lib/types";

/** Nearest deadline first; undated at the end; among equals, newer on top. */
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
  const { t } = useI18n();
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  /** React only to card drags — files fall through to the card. */
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
              // * Moving onto a child element is not leaving the column yet
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              setOverColumn((current) => (current === status ? null : current));
            }}
            onDrop={(event) => drop(status, event)}
          >
            <header className="column-head">
              <span className="column-dot" aria-hidden />
              <h2 className="column-title">{t.status[status]}</h2>
              <span className="column-count">{items.length}</span>
              {late > 0 && (
                <span className="column-late" title={t.board.overdueTitle}>
                  {t.board.overdueCount(late)}
                </span>
              )}
            </header>

            <div className="column-body">
              {items.length === 0 ? (
                <p className="column-empty">{t.board.empty[status]}</p>
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
