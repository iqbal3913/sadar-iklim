import { Cloud, CloudLightning, CloudRain, CloudSun, Wind } from "lucide-react";
import type { Conditions } from "@/lib/types";
import { formatDateTime, formatTime } from "@/lib/format";
import { Panel, cx } from "@/components/ui";

function WeatherIcon({ description }: { description: string }) {
  const d = description.toLowerCase();
  const cls = "size-5 text-teal";
  if (d.includes("petir")) return <CloudLightning className={cls} aria-hidden />;
  if (d.includes("hujan")) return <CloudRain className={cls} aria-hidden />;
  if (d.includes("cerah")) return <CloudSun className={cls} aria-hidden />;
  if (d.includes("asap")) return <Wind className={cls} aria-hidden />;
  return <Cloud className={cls} aria-hidden />;
}

export function ConditionsCard({ conditions, source }: { conditions: Conditions; source: string }) {
  const hasWaves = conditions.slots.some((s) => s.waveM > 0);
  return (
    <Panel title="Prakiraan per 3 jam" action={<span className="text-xs text-muted">{source}</span>}>
      <ol tabIndex={0} aria-label="Prakiraan per 3 jam, dapat digeser" className="thin-scroll -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {conditions.slots.map((s, i) => (
          <li key={s.time} className={cx("w-28 shrink-0 snap-start rounded-lg p-3", i === 0 ? "bg-teal-soft ring-1 ring-teal/20" : "bg-canvas")}>
            <p className="text-xs font-semibold tabular-nums text-muted">{formatTime(s.time)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <WeatherIcon description={s.description} />
              <span className="text-lg font-semibold tabular-nums text-ink">{s.tempC}°</span>
            </div>
            <p className="mt-1 truncate text-xs text-ink-soft" title={s.description}>
              {s.description}
            </p>
            <p className="mt-2 text-xs tabular-nums text-muted">Angin {s.windMs} m/s</p>
            {hasWaves && <p className="text-xs tabular-nums text-muted">Gelombang {s.waveM} m</p>}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">
        {conditions.regionName}. Prakiraan diproduksi {formatDateTime(conditions.sourceUpdatedAt)}
      </p>
    </Panel>
  );
}
