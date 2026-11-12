import type { Snapshot } from "@/lib/data";
import { facilityLabel, formatDateTime } from "@/lib/format";
import { Panel, cx } from "@/components/ui";

export function EarthquakePanel({ snapshot }: { snapshot: Snapshot }) {
  const q = snapshot.earthquake;
  if (!q) return null;
  return (
    <Panel
      title="Gempa terbaru"
      action={
        snapshot.mode === "SIMULATION" ? (
          <span className="text-xs text-sim-ink">Replay simulasi</span>
        ) : (
          <span className="text-xs text-muted">Sumber: BMKG</span>
        )
      }
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <p className="text-3xl font-bold tabular-nums leading-none text-ink">{q.magnitude}</p>
          <p className="mt-1 text-xs text-muted">magnitudo</p>
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium text-ink">{q.region}</p>
          <p className="text-xs text-muted">
            {formatDateTime(q.occurredAt)}, kedalaman {q.depthKm} km
          </p>
          <p className="mt-2 text-ink-soft">{q.felt}</p>
          <p className="mt-1 text-xs text-muted">{q.potential}</p>
          {q.shakemapUrl && (
            <a
              href={q.shakemapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block text-xs font-semibold text-teal hover:underline"
            >
              Lihat shakemap
            </a>
          )}
        </div>
      </div>
    </Panel>
  );
}

export function FacilityPanel({ snapshot }: { snapshot: Snapshot }) {
  if (snapshot.facilities.length === 0) return null;
  const exposed = snapshot.facilities.filter((f) => f.exposed);
  return (
    <Panel
      title="Fasilitas kritis"
      action={
        <span className={cx("text-xs font-semibold", exposed.length > 0 ? "text-danger" : "text-live")}>
          {exposed.length} terpapar{snapshot.mode === "LIVE" && " · contoh"}
        </span>
      }
    >
      <ul className="divide-y divide-line">
        {snapshot.facilities.map((f) => (
          <li key={f.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={cx("size-2 shrink-0 rounded-full", f.exposed ? "bg-danger" : "bg-live")} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{f.name}</p>
              <p className="text-xs text-muted">
                {facilityLabel[f.type]}
                {f.distanceKm !== null && ` · ${f.distanceKm} km`}
                {f.verification === "unverified" && " · belum diverifikasi"}
              </p>
            </div>
            <span className={cx("text-xs", f.exposed ? "font-semibold text-danger" : "text-muted")}>
              {f.exposed ? "Terpapar" : "Aman"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Status terpapar bersifat awal dan perlu konfirmasi petugas</p>
    </Panel>
  );
}

const confidenceDot = { low: "bg-[#f59e0b]", nominal: "bg-warn", high: "bg-danger" } as const;

export function HotspotPanel({ snapshot }: { snapshot: Snapshot }) {
  if (snapshot.hotspots.length === 0) return null;
  const high = snapshot.hotspots.filter((h) => h.confidence === "high").length;
  return (
    <Panel title="Titik panas satelit" action={<span className="text-xs text-sim-ink">Data simulasi</span>}>
      <div className="flex items-end gap-6">
        <div>
          <p className="text-3xl font-bold tabular-nums leading-none text-ink">{snapshot.hotspots.length}</p>
          <p className="mt-1 text-xs text-muted">titik, {high} confidence tinggi</p>
        </div>
        {snapshot.windVector && (
          <div>
            <p className="text-lg font-semibold tabular-nums leading-none text-ink">{snapshot.windVector.speedMs} m/s</p>
            <p className="mt-1 text-xs text-muted">angin dari {snapshot.windVector.fromDeg}°</p>
          </div>
        )}
      </div>
      <ul className="mt-4 divide-y divide-line text-xs">
        {snapshot.hotspots.map((h) => (
          <li key={h.id} className="flex items-center gap-3 py-2">
            <span className={cx("size-2 shrink-0 rounded-full", confidenceDot[h.confidence])} aria-hidden />
            <span className="flex-1 text-ink-soft">{h.sensor}</span>
            <span className="tabular-nums text-muted">FRP {h.frp}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Deteksi satelit, bukan konfirmasi kebakaran aktif di lapangan</p>
    </Panel>
  );
}
