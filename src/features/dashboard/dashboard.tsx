"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { MapLoader, type LayerKey } from "@/components/map/map-loader";
import { LayerMenu } from "@/components/map/layer-panel";
import { RegionPicker } from "@/components/map/region-picker";
import { cx } from "@/components/ui";
import { BulletinCard } from "@/features/ibf/bulletin-card";
import { ConditionsCard } from "@/features/ibf/conditions-card";
import { EarthquakePanel, FacilityPanel, HotspotPanel } from "./side-panels";
import { RoutesPanel } from "./routes-panel";
import { AlertsPanel } from "./alerts-panel";
import { SummaryStrip } from "./summary-strip";

const allLayers: LayerKey[] = ["alerts", "hazard", "smoke", "hotspots", "facilities", "reports", "shelters", "routes", "earthquake"];

export function Dashboard() {
  const { snapshot } = useAppState();
  const [layers, setLayers] = useState<Set<LayerKey>>(new Set(allLayers));
  const [tab, setTab] = useState<"peta" | "info">("peta");

  useEffect(() => {
    setLayers(new Set(allLayers));
  }, [snapshot.scenarioCode, snapshot.mode]);

  const toggle = (key: LayerKey) =>
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-5">
      <SummaryStrip snapshot={snapshot} />

      <div className="flex border-b border-line lg:hidden" role="tablist" aria-label="Tampilan">
        {[
          { id: "peta" as const, label: "Peta" },
          { id: "info" as const, label: "Informasi" },
        ].map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cx(
              "-mb-px flex-1 border-b-2 py-2.5 text-sm font-semibold transition-colors",
              tab === id ? "border-teal text-ink" : "border-transparent text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <div className={cx(tab === "info" && "hidden lg:block")}>
          <div className="relative h-[65vh] min-h-[400px] overflow-hidden rounded-2xl border border-line lg:sticky lg:top-24 lg:h-[calc(100dvh-7.5rem)]">
            <MapLoader snapshot={snapshot} layers={layers} />
            <div className="absolute right-3 top-3 z-[600] flex items-center gap-2">
              {snapshot.mode === "LIVE" && <RegionPicker />}
              <LayerMenu snapshot={snapshot} layers={layers} onToggle={toggle} />
            </div>
          </div>
        </div>

        <div className={cx("space-y-4", tab === "peta" && "hidden lg:block")}>
          <AlertsPanel snapshot={snapshot} />
          <ConditionsCard
            conditions={snapshot.conditions}
            source={snapshot.region ? "Sumber: BMKG" : snapshot.mode === "SIMULATION" ? "Simulasi" : "Contoh"}
          />
          {!snapshot.region && <BulletinCard bulletin={snapshot.bulletin} sample={snapshot.mode === "LIVE"} />}
          <EarthquakePanel snapshot={snapshot} />
          <HotspotPanel snapshot={snapshot} />
          <FacilityPanel snapshot={snapshot} />
          <RoutesPanel snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
}
