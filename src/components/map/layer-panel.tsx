"use client";

import { useEffect, useRef, useState } from "react";
import { Layers } from "lucide-react";
import type { Snapshot } from "@/lib/data";
import type { LayerKey } from "./map-loader";
import { cx } from "../ui";
import { facilityLegend } from "./facility-style";

interface Item {
  key: LayerKey;
  label: string;
  swatch: string;
  available: (s: Snapshot) => boolean;
}

const items: Item[] = [
  { key: "alerts", label: "Peringatan dini BMKG", swatch: "rounded-sm bg-[#f59e0b]/40 ring-1 ring-warn", available: (s) => s.alerts.some((a) => (a.detail?.polygons.length ?? 0) > 0) },
  { key: "hazard", label: "Zona bahaya", swatch: "rounded-sm bg-[#3b82f6]/40 ring-1 ring-[#1d4ed8]", available: (s) => s.polygons.some((p) => p.kind !== "smoke_corridor") },
  { key: "smoke", label: "Koridor asap indikatif", swatch: "rounded-sm bg-[#78716c]/40 ring-1 ring-dashed ring-[#57534e]", available: (s) => s.polygons.some((p) => p.kind === "smoke_corridor") },
  { key: "hotspots", label: "Titik panas", swatch: "rounded-full bg-danger", available: (s) => s.hotspots.length > 0 },
  { key: "facilities", label: "Fasilitas kritis", swatch: "rounded-[3px] bg-ink-soft", available: (s) => s.facilities.length > 0 },
  { key: "reports", label: "Laporan warga", swatch: "rounded-sm bg-warn [clip-path:polygon(50%_0,100%_100%,0_100%)]", available: (s) => s.reports.length > 0 },
  { key: "shelters", label: "Shelter", swatch: "rotate-45 rounded-[2px] bg-live", available: (s) => s.shelters.length > 0 },
  { key: "routes", label: "Rute kandidat", swatch: "h-1 rounded-full bg-live", available: (s) => s.routes.length > 0 },
  { key: "earthquake", label: "Gempa", swatch: "rounded-full bg-ink", available: (s) => s.earthquake !== null },
];

export function LayerMenu({
  snapshot,
  layers,
  onToggle,
}: {
  snapshot: Snapshot;
  layers: Set<LayerKey>;
  onToggle: (key: LayerKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const available = items.filter((i) => i.available(snapshot));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-[var(--shadow-lift)] ring-1 ring-line hover:bg-canvas"
      >
        <Layers className="size-4 text-teal" aria-hidden />
        Lapisan
        <span className="rounded bg-teal-soft px-1.5 text-[11px] text-teal tabular-nums">
          {available.filter((i) => layers.has(i.key)).length}
        </span>
      </button>

      {open && (
        <fieldset className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-surface p-2 shadow-[var(--shadow-lift)] ring-1 ring-line">
          <legend className="sr-only">Lapisan peta</legend>
          {available.length === 0 && <p className="px-2 py-3 text-xs text-muted">Tidak ada lapisan pada mode ini</p>}
          {available.map(({ key, label, swatch }) => (
            <div key={key}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-canvas">
                <input
                  type="checkbox"
                  checked={layers.has(key)}
                  onChange={() => onToggle(key)}
                  className="size-4 accent-[#0f766e]"
                />
                <span className="grid w-4 place-items-center">
                  <span className={cx("block size-3", swatch)} aria-hidden />
                </span>
                <span className={cx(layers.has(key) ? "text-ink" : "text-muted")}>{label}</span>
              </label>
              {key === "facilities" && layers.has(key) && (
                <ul className="mb-1 ml-11 grid grid-cols-2 gap-x-3 gap-y-1 pb-1 text-xs text-muted">
                  {facilityLegend.map((l) => (
                    <li key={l.label} className="flex items-center gap-1.5">
                      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: l.color }} aria-hidden />
                      {l.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </fieldset>
      )}
    </div>
  );
}
