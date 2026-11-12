"use client";

import { useAppState } from "@/lib/app-state";
import type { Snapshot } from "@/lib/data";
import type { RoadStatus } from "@/lib/types";
import { roadStatusLabel } from "@/lib/format";
import { Panel, cx } from "@/components/ui";

const decisionLabel = {
  recommended: "Disarankan",
  caution: "Waspada",
  not_recommended: "Tidak disarankan",
} as const;
const decisionText = { recommended: "text-live", caution: "text-warn", not_recommended: "text-danger" } as const;
const segmentColor: Record<RoadStatus, string> = {
  OPEN: "bg-live",
  CAUTION: "bg-warn",
  BLOCKED: "bg-danger",
  UNKNOWN: "bg-muted/40",
};

export function RoutesPanel({ snapshot }: { snapshot: Snapshot }) {
  const { routeDecisions } = useAppState();
  if (snapshot.routes.length === 0) return null;
  return (
    <Panel title="Rute evakuasi kandidat">
      <ul className="divide-y divide-line">
        {snapshot.routes.map((r) => (
          <li key={r.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink">{r.name}</p>
              <span className={cx("shrink-0 text-xs font-semibold", decisionText[r.decision])}>
                {decisionLabel[r.decision]}
              </span>
            </div>
            {routeDecisions[r.id] && (
              <p className={cx("mt-0.5 text-xs font-semibold", routeDecisions[r.id] === "approved" ? "text-live" : "text-danger")}>
                {routeDecisions[r.id] === "approved" ? "Disetujui petugas" : "Ditolak petugas"}
              </p>
            )}
            <p className="mt-0.5 text-xs tabular-nums text-muted">
              {r.distanceKm} km · {r.durationMin} menit · {r.affectedSegments} ruas terdampak
            </p>
            <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={r.segments.map((s) => roadStatusLabel[s.status]).join(", ")}>
              {r.segments.map((s, i) => (
                <span key={i} className={cx("flex-1", segmentColor[s.status])} />
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">{r.rationale}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Dihitung dari graph jalan, bukan AI. Semua rute perlu persetujuan petugas
      </p>
    </Panel>
  );
}
