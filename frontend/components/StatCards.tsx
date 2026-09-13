"use client";

import { useI18n } from "@/components/LanguageProvider";
import type { Stats } from "@/lib/types";

const CARDS: { key: keyof Stats; className: string }[] = [
  { key: "total", className: "" },
  { key: "todo", className: "accent" },
  { key: "in_progress", className: "progress" },
  { key: "done", className: "done" },
  { key: "overdue", className: "overdue" },
];

export default function StatCards({ stats }: { stats: Stats | null }) {
  const { t } = useI18n();

  return (
    <section className="stats">
      {CARDS.map((card) => (
        <div key={card.key} className={`stat ${card.className}`}>
          <div className="stat-value">{stats ? stats[card.key] : "—"}</div>
          <div className="stat-label">{t.stats[card.key]}</div>
        </div>
      ))}
    </section>
  );
}
