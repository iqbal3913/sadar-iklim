import { Activity, BellRing, Building2, ClipboardList, Flame, MapPin, Thermometer, Waves, Wind, type LucideIcon } from "lucide-react";
import type { Snapshot } from "@/lib/data";
import type { ImpactLevel } from "@/lib/types";
import { formatDateTime, hazardLabel, impactLabel } from "@/lib/format";
import { ModeBadge, cx } from "@/components/ui";

const impactTheme: Record<ImpactLevel, { text: string; dot: string; soft: string }> = {
  low: { text: "text-live", dot: "bg-live", soft: "bg-live-soft" },
  moderate: { text: "text-stale", dot: "bg-stale", soft: "bg-stale-soft" },
  high: { text: "text-warn", dot: "bg-warn", soft: "bg-warn-soft" },
  extreme: { text: "text-danger", dot: "bg-danger", soft: "bg-danger-soft" },
};

function Stat({ label, value, Icon }: { label: string; value: string; Icon: LucideIcon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-surface/80 px-3 py-3 ring-1 ring-line sm:px-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight tabular-nums text-ink">{value}</p>
        <p className="text-xs leading-snug text-muted">{label}</p>
      </div>
    </div>
  );
}

export function SummaryStrip({ snapshot }: { snapshot: Snapshot }) {
  const b = snapshot.bulletin;
  const region = snapshot.region;
  const pending = snapshot.reports.filter((r) => r.status === "needs_review" || r.status === "submitted").length;
  const exposed = snapshot.facilities.filter((f) => f.exposed).length;
  const maxWave = Math.max(0, ...snapshot.conditions.slots.map((s) => s.waveM));
  const regionAlerts = snapshot.alerts.filter((a) => a.inRegion);
  const alert = regionAlerts[0];
  const now = snapshot.conditions.slots[0];

  const theme = region
    ? alert
      ? impactTheme.high
      : impactTheme.low
    : impactTheme[b.impactLevel];
  const chip = region
    ? alert
      ? "Peringatan dini aktif"
      : "Tanpa peringatan dini aktif"
    : `Dampak ${impactLabel[b.impactLevel]}`;
  const headline = region
    ? (alert?.detail?.headline || alert?.title) ?? `${now.description} di ${region.village}, tidak ada peringatan dini cuaca untuk ${region.province}`
    : b.headline;
  const expires = region ? alert?.detail?.expires ?? null : b.validUntil;

  const stats = region
    ? [
        { label: "Suhu", value: `${now.tempC}°C`, Icon: Thermometer },
        { label: "Angin", value: `${now.windMs} m/s`, Icon: Wind },
        { label: "Peringatan aktif", value: `${regionAlerts.length}`, Icon: BellRing },
        { label: "Gempa terakhir", value: snapshot.earthquake ? `M ${snapshot.earthquake.magnitude}` : "—", Icon: Activity },
      ]
    : [
        { label: "Gelombang maks", value: maxWave > 0 ? `${maxWave} m` : "—", Icon: Waves },
        { label: "Fasilitas terpapar", value: `${exposed}/${snapshot.facilities.length}`, Icon: Building2 },
        { label: "Laporan menunggu", value: `${pending}`, Icon: ClipboardList },
        { label: "Titik panas", value: `${snapshot.hotspots.length}`, Icon: Flame },
      ];

  return (
    <section aria-label="Ringkasan situasi" className="flex flex-col gap-5 rounded-2xl border border-line bg-gradient-to-br from-teal-soft/80 via-surface to-surface p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold", theme.soft, theme.text)}>
            <span className={cx("size-1.5 rounded-full", theme.dot)} aria-hidden />
            {chip}
          </span>
          {region ? (
            <span className="text-muted">Sumber: BMKG</span>
          ) : (
            <>
              <span className="text-muted">{hazardLabel[b.hazardType]}</span>
              {snapshot.mode === "SIMULATION" ? (
                <ModeBadge mode="SIMULATION" />
              ) : (
                <span className="rounded-full bg-canvas px-2.5 py-1 font-semibold text-muted ring-1 ring-line">Contoh</span>
              )}
            </>
          )}
        </div>
        <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight text-ink sm:text-[1.75rem]">{headline}</h1>
        <p className="mt-2 flex flex-wrap items-start gap-x-1.5 text-sm text-muted [&>svg]:mt-1">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 sm:flex-none">
            {region ? `${region.village}, ${region.city}, ${region.province}` : `${b.village}, ${b.district}, ${b.province}`}
          </span>
          {expires && (
            <>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span className="max-sm:basis-full max-sm:pl-5">sampai {formatDateTime(expires)}</span>
            </>
          )}
        </p>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4 xl:w-[28rem] xl:grid-cols-2">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} Icon={s.Icon} />
        ))}
      </div>
    </section>
  );
}
