import type { Snapshot } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { ExternalIcon, Panel } from "@/components/ui";

export function AlertsPanel({ snapshot }: { snapshot: Snapshot }) {
  const source = snapshot.sources.find((s) => s.key === "alerts");
  if (!source) return null;
  const inRegion = snapshot.alerts.filter((a) => a.inRegion);
  const elsewhere = snapshot.alerts.filter((a) => !a.inRegion);

  return (
    <Panel
      title="Peringatan dini cuaca"
      action={<span className="text-xs text-muted">Sumber: BMKG</span>}
    >
      {source.status === "LOADING" && <p className="text-sm text-muted">Memuat peringatan dini</p>}
      {source.status === "ERROR" && (
        <p className="text-sm text-danger">Peringatan dini BMKG tidak dapat dijangkau. Periksa langsung di bmkg.go.id</p>
      )}
      {(source.status === "LIVE" || source.status === "STALE") && (
        <>
          {inRegion.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Tidak ada peringatan dini aktif{snapshot.region && ` untuk ${snapshot.region.province}`}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {inRegion.map((a) => (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-ink">{a.detail?.headline || a.title}</p>
                  {a.detail && (
                    <p className="mt-0.5 text-xs text-muted">
                      {[a.detail.event, a.detail.severity, a.detail.urgency].filter(Boolean).join(" · ")}
                      {a.detail.expires && ` · sampai ${formatDateTime(a.detail.expires)}`}
                    </p>
                  )}
                  <p className="mt-1.5 text-sm text-ink-soft">{a.detail?.description || a.description}</p>
                  {a.detail?.web && (
                    <a
                      href={a.detail.web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-teal hover:underline"
                    >
                      Infografik BMKG <ExternalIcon className="size-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {elsewhere.length > 0 && (
            <details className="mt-3 border-t border-line pt-3">
              <summary className="cursor-pointer text-xs font-semibold text-teal">
                {elsewhere.length} peringatan aktif di provinsi lain
              </summary>
              <ul className="mt-2 space-y-1.5 text-xs text-ink-soft">
                {elsewhere.map((a) => (
                  <li key={a.id}>{a.title}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </Panel>
  );
}
