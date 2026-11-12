import { ChevronDown } from "lucide-react";
import type { IbfBulletin } from "@/lib/types";
import {
  audienceLabel,
  formatDateTime,
  formatTime,
  horizonLabel,
  priorityLabel,
  sourceLabel,
} from "@/lib/format";
import { Panel, cx } from "@/components/ui";

const priorityDot = { recommended: "bg-teal", urgent: "bg-warn", critical: "bg-danger" } as const;
const priorityText = { recommended: "text-teal", urgent: "text-warn", critical: "text-danger" } as const;

export function BulletinCard({ bulletin, sample }: { bulletin: IbfBulletin; sample: boolean }) {
  return (
    <Panel
      title="Apa yang perlu dilakukan"
      action={sample && <span className="text-xs text-muted">Contoh, belum dari data live</span>}
    >
      <p className="text-sm leading-relaxed text-ink-soft">{bulletin.summary}</p>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {bulletin.actions.map((a, i) => (
          <li key={i} className="flex gap-3 py-3">
            <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", priorityDot[a.priority])} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{a.action}</p>
              <p className="mt-0.5 text-xs text-muted">
                <span className={cx("font-semibold", priorityText[a.priority])}>{priorityLabel[a.priority]}</span>
                {" · "}
                {audienceLabel[a.audience]}
                {" · "}
                {horizonLabel[a.timeHorizon]}
                {" · "}
                <span className="font-mono text-[11px]">{a.evidenceIds.join(", ")}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted">
        Berlaku {formatDateTime(bulletin.validFrom)} sampai {formatTime(bulletin.validUntil)} WIB. Dibuat{" "}
        {formatDateTime(bulletin.generatedAt)}
      </p>

      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-teal">
          Lihat bukti dan sumber
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="mt-3 space-y-3">
          {bulletin.evidence.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="text-xs text-muted">
                <span className="font-semibold text-ink-soft">{sourceLabel[e.source]}</span>
                {" · "}
                <code>{e.id}</code>
                {" · "}
                {e.observedAt ? formatDateTime(e.observedAt) : "Waktu observasi tidak tersedia"}
              </p>
              <p className="mt-0.5 text-ink-soft">{e.observation}</p>
            </li>
          ))}
        </ul>
        {bulletin.uncertaintyNotes.length > 0 && (
          <ul className="mt-3 list-disc space-y-0.5 pl-4 text-xs text-muted">
            {bulletin.uncertaintyNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </details>

      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{bulletin.disclaimer}</p>
    </Panel>
  );
}
