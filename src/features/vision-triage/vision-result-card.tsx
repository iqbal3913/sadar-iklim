import { ScanSearch } from "lucide-react";
import type { VisionResult } from "@/lib/types";
import { classificationLabel, integrityLabel, urgencyLabel } from "@/lib/format";
import { Pill } from "@/components/ui";

const urgencyTone = { low: "ok", moderate: "warn", high: "danger", critical: "danger" } as const;
const confLabel = { low: "rendah", medium: "sedang", high: "tinggi" } as const;

export function VisionResultCard({ result }: { result: VisionResult }) {
  return (
    <div className="space-y-4 rounded-xl border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ScanSearch className="size-4 text-teal" aria-hidden />
        <h3 className="text-sm font-semibold">Hasil triase AI</h3>
        <Pill tone="sim">Asistif, bukan keputusan</Pill>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">Klasifikasi</dt>
          <dd className="font-semibold">{classificationLabel[result.classification] ?? result.classification}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Prioritas</dt>
          <dd>
            <Pill tone={urgencyTone[result.urgency]}>{urgencyLabel[result.urgency]}</Pill>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Keyakinan</dt>
          <dd className="font-semibold">{confLabel[result.confidence]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Estimasi genangan</dt>
          <dd className="font-semibold">{result.waterDepthCm === null ? "Tidak dapat diperkirakan" : `${result.waterDepthCm} cm`}</dd>
        </div>
      </dl>

      {result.observations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-soft">Pengamatan visual</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
            {result.observations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {result.hazards.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.hazards.map((h) => (
            <Pill key={h} tone="warn">
              {h}
            </Pill>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-surface p-3 text-sm">
        <p className="text-xs font-semibold text-ink-soft">Tindakan awal</p>
        <p className="mt-0.5">{result.nextAction}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-ink-soft">Keterbatasan</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted">
          {result.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted">
        Penilaian visual: {integrityLabel[result.integrity]}. Ini bukan pernyataan bahwa foto asli atau palsu
        {result.reviewRequired && ". Memerlukan verifikasi petugas"}
      </p>
    </div>
  );
}
