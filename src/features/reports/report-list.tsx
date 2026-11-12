"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, MapPin, Plus } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { formatDateTime, statusLabel, urgencyLabel } from "@/lib/format";
import type { ReportStatus } from "@/lib/types";
import { Button, EmptyState, Pill, cx } from "@/components/ui";

const statusTone = {
  submitted: "neutral",
  needs_review: "warn",
  verified: "ok",
  rejected: "danger",
  duplicate: "neutral",
} as const;

const filters: Array<{ value: "all" | ReportStatus; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "needs_review", label: "Menunggu verifikasi" },
  { value: "verified", label: "Terverifikasi" },
  { value: "rejected", label: "Ditolak" },
];

export function ReportList() {
  const { snapshot, user } = useAppState();
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");
  const reports = snapshot.reports.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Laporan warga</h1>
          <p className="mt-1 text-sm text-muted">
            Laporan mentah belum memengaruhi peta bahaya atau rute sebelum diverifikasi petugas
          </p>
        </div>
        <Link href={user ? "/reports/new" : "/login"}>
          <Button>
            <Plus className="size-4" aria-hidden /> Buat laporan
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Saring status">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={cx(
              "rounded-full border px-3 py-1 text-sm",
              filter === f.value ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-ink/30",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState title="Belum ada laporan" text="Tidak ada laporan yang cocok dengan penyaring pada mode data ini" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/reports/${r.id}`}
                className="flex h-full gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-teal/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.photo} alt="" className="size-24 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone={statusTone[r.status]}>{statusLabel[r.status]}</Pill>
                    {r.dataMode === "simulation" && <Pill tone="sim">Simulasi</Pill>}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm font-semibold">{r.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <MapPin className="size-3" aria-hidden /> {r.village}
                  </p>
                  <p className="text-xs text-muted">{formatDateTime(r.observedAt)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                    <Camera className="size-3" aria-hidden /> Tingkat {urgencyLabel[r.severity].toLowerCase()}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
