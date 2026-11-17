"use client";

import { Activity, BellRing, CloudSun, Database, type LucideIcon } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { formatDateTime } from "@/lib/format";
import type { SourceStatus } from "@/lib/types";
import { Pill } from "@/components/ui";

const icons: Record<string, LucideIcon> = {
  forecast: CloudSun,
  earthquakes: Activity,
  alerts: BellRing,
  sample: Database,
};

const statusView: Record<SourceStatus["status"], { label: string; tone: "ok" | "warn" | "danger" | "neutral" | "sim" }> = {
  LIVE: { label: "Live", tone: "ok" },
  STALE: { label: "Data terakhir", tone: "warn" },
  ERROR: { label: "Tidak terjangkau", tone: "danger" },
  LOADING: { label: "Memuat", tone: "neutral" },
  SAMPLE: { label: "Contoh", tone: "neutral" },
  SIMULATION: { label: "Simulasi", tone: "sim" },
};

export function SourceStatusList() {
  const { snapshot, ready } = useAppState();
  if (!ready || snapshot.sources.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {snapshot.sources.map((s) => {
        const view = statusView[s.status];
        const Icon = icons[s.key] ?? Database;
        return (
          <li key={s.key} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-canvas text-teal">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{s.label}</p>
              <p className="truncate text-xs text-muted" title={s.note ?? undefined}>
                {s.updatedAt ? `Diperbarui ${formatDateTime(s.updatedAt)}` : (s.note ?? "Belum ada pembaruan")}
              </p>
            </div>
            <Pill tone={view.tone}>{view.label}</Pill>
          </li>
        );
      })}
    </ul>
  );
}