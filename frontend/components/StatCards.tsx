"use client";

import type { Stats } from "@/lib/types";

const CARDS: { key: keyof Stats; label: string; className: string }[] = [
  { key: "total", label: "Усього задач", className: "" },
  { key: "todo", label: "До виконання", className: "accent" },
  { key: "in_progress", label: "В роботі", className: "progress" },
  { key: "done", label: "Виконано", className: "done" },
  { key: "overdue", label: "Прострочено", className: "overdue" },
];

export default function StatCards({ stats }: { stats: Stats | null }) {
  return (
    <section className="stats">
      {CARDS.map((card) => (
        <div key={card.key} className={`stat ${card.className}`}>
          <div className="stat-value">{stats ? stats[card.key] : "—"}</div>
          <div className="stat-label">{card.label}</div>
        </div>
      ))}
    </section>
  );
}
