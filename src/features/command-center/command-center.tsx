"use client";

import Link from "next/link";
import { useAppState } from "@/lib/app-state";
import { MapLoader } from "@/components/map/map-loader";
import { formatDateTime, statusLabel, urgencyLabel } from "@/lib/format";
import { ImpactBadge, ModeBadge, Panel, Pill } from "@/components/ui";
import type { LayerKey } from "@/components/map/map-loader";

const layers = new Set<LayerKey>(["alerts", "hazard", "smoke", "hotspots", "facilities", "reports", "shelters", "routes", "earthquake"]);

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 sm:px-5">
      <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export function CommandCenter() {
  const { snapshot } = useAppState();
  const queue = snapshot.reports
    .filter((r) => r.status === "needs_review" || r.status === "submitted")
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, moderate: 2, low: 3, unknown: 4 } as const;
      return rank[a.severity] - rank[b.severity];
    });
  const exposed = snapshot.facilities.filter((f) => f.exposed).length;
  const cautionRoutes = snapshot.routes.filter((r) => r.decision !== "recommended").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="mt-1 text-sm text-muted">{snapshot.conditions.regionName}</p>
        </div>
        <div className="flex items-center gap-2">
          <ImpactBadge level={snapshot.bulletin.impactLevel} />
          <ModeBadge mode={snapshot.mode} />
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x divide-line border-y border-line py-4">
        <Stat label="Laporan menunggu" value={queue.length} />
        <Stat label="Fasilitas terpapar" value={exposed} />
        <Stat label="Rute perlu perhatian" value={cautionRoutes} />
        <Stat label="Titik panas" value={snapshot.hotspots.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="h-[420px] overflow-hidden rounded-xl border border-line lg:h-[560px]">
          <MapLoader snapshot={snapshot} layers={layers} />
        </div>

        <Panel title="Antrean verifikasi" action={<span className="text-xs text-muted">{queue.length} menunggu</span>}>
          {queue.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Tidak ada laporan yang menunggu</p>
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((r) => (
                <li key={r.id}>
                  <Link href={`/reports/${r.id}`} className="flex gap-3 py-3 hover:bg-canvas">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.photo} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold">{r.title}</p>
                      <p className="text-xs text-muted">{formatDateTime(r.observedAt)}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Pill tone={r.severity === "critical" || r.severity === "high" ? "danger" : "warn"}>
                          {urgencyLabel[r.severity]}
                        </Pill>
                        <Pill tone="neutral">{statusLabel[r.status]}</Pill>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Rute kandidat menunggu persetujuan">
        {snapshot.routes.length === 0 ? (
          <p className="text-sm text-muted">Tidak ada rute kandidat pada mode data ini</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {snapshot.routes.map((r) => (
              <li key={r.id} className="rounded-lg border border-line p-3">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {r.distanceKm} km, {r.durationMin} menit, {r.affectedSegments} ruas terdampak
                </p>
                <p className="mt-2 text-sm text-ink-soft">{r.rationale}</p>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-deep">
                    Setujui untuk wilayah
                  </button>
                  <button className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-canvas">
                    Tolak
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
