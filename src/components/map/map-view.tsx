"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Check, Map as MapIcon, Minus, Plus } from "lucide-react";
import { MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { Snapshot } from "@/lib/data";
import type { RoadStatus } from "@/lib/types";
import { facilityColor, facilityExposedColor } from "./facility-style";
import {
  facilityLabel,
  formatDateTime,
  roadStatusLabel,
  statusLabel,
  urgencyLabel,
} from "@/lib/format";

export type LayerKey =
  | "alerts"
  | "hazard"
  | "smoke"
  | "hotspots"
  | "facilities"
  | "reports"
  | "shelters"
  | "routes"
  | "earthquake";

const basemaps = [
  {
    id: "terang",
    label: "Terang",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri, HERE, Garmin, OpenStreetMap contributors",
    subdomains: "abc",
    maxNativeZoom: 16,
  },
  {
    id: "jalan",
    label: "Jalan",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abc",
    maxNativeZoom: 19,
  },
  {
    id: "satelit",
    label: "Satelit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
    subdomains: "abc",
    maxNativeZoom: 18,
  },
] as const;

type BasemapId = (typeof basemaps)[number]["id"];

function BasemapControl({ value, onChange }: { value: BasemapId; onChange: (id: BasemapId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute left-3 top-[100px] z-[600]">
      <button
        type="button"
        aria-label="Ganti peta dasar"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-lg bg-surface text-ink-soft shadow-[var(--shadow-lift)] ring-1 ring-line transition-colors hover:bg-teal-soft hover:text-teal"
      >
        <MapIcon className="size-4" strokeWidth={2.25} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-36 rounded-xl bg-surface p-1 shadow-[var(--shadow-lift)] ring-1 ring-line">
          {basemaps.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onChange(b.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-canvas"
            >
              {b.label}
              {value === b.id && <Check className="size-4 text-teal" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const roadColor: Record<RoadStatus, string> = {
  OPEN: "#047857",
  CAUTION: "#c2410c",
  BLOCKED: "#b91c1c",
  UNKNOWN: "#64748b",
};

const roadDash: Record<RoadStatus, string | undefined> = {
  OPEN: undefined,
  CAUTION: "10 6",
  BLOCKED: "2 8",
  UNKNOWN: "4 4",
};

function shapeIcon(shape: "circle" | "square" | "diamond" | "triangle", color: string, size = 18) {
  const base = `width:${size}px;height:${size}px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);`;
  const styles: Record<string, string> = {
    circle: `${base}border-radius:50%;`,
    square: `${base}border-radius:3px;`,
    diamond: `${base}transform:rotate(45deg);border-radius:3px;`,
    triangle: `width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size}px solid ${color};filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));`,
  };
  return L.divIcon({
    className: "",
    html: `<div style="${styles[shape]}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const confidenceColor = { low: "#f59e0b", nominal: "#ea580c", high: "#b91c1c" } as const;

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [map, center, zoom]);
  return null;
}

export default function MapView({
  snapshot,
  layers,
  height = "100%",
}: {
  snapshot: Snapshot;
  layers: Set<LayerKey>;
  height?: string;
}) {
  const sim = snapshot.mode === "SIMULATION";
  const [map, setMap] = useState<L.Map | null>(null);
  const [basemapId, setBasemapId] = useState<BasemapId>("terang");
  const basemap = basemaps.find((b) => b.id === basemapId) ?? basemaps[0];
  const smoke = snapshot.polygons.filter((p) => p.kind === "smoke_corridor");
  const hazards = snapshot.polygons.filter((p) => p.kind !== "smoke_corridor");

  return (
    <div className={sim ? "sim-watermark relative" : "relative"} style={{ height }}>
      <div className="absolute left-3 top-3 z-[600] flex flex-col overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-lift)] ring-1 ring-line">
        <button
          type="button"
          aria-label="Perbesar peta"
          onClick={() => map?.zoomIn()}
          className="grid size-9 place-items-center text-ink-soft transition-colors hover:bg-teal-soft hover:text-teal"
        >
          <Plus className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
        <span className="h-px bg-line" aria-hidden />
        <button
          type="button"
          aria-label="Perkecil peta"
          onClick={() => map?.zoomOut()}
          className="grid size-9 place-items-center text-ink-soft transition-colors hover:bg-teal-soft hover:text-teal"
        >
          <Minus className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      <BasemapControl value={basemapId} onChange={setBasemapId} />
      <MapContainer
        ref={setMap}
        zoomControl={false}
        center={snapshot.center}
        zoom={snapshot.zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: 0 }}
      >
        <TileLayer key={basemap.id} attribution={basemap.attribution} url={basemap.url} subdomains={basemap.subdomains} maxNativeZoom={basemap.maxNativeZoom} maxZoom={19} />
        <Recenter center={snapshot.center} zoom={snapshot.zoom} />

        {layers.has("alerts") &&
          snapshot.alerts.flatMap((a) =>
            (a.detail?.polygons ?? []).map((positions, i) => (
              <Polygon
                key={`${a.id}-${i}`}
                positions={positions}
                pathOptions={{ color: "#b45309", fillColor: "#f59e0b", fillOpacity: 0.22, weight: 1.5 }}
              >
                <Popup>
                  <strong>{a.detail?.headline || a.title}</strong>
                  <br />
                  Sumber: BMKG
                </Popup>
              </Polygon>
            )),
          )}

        {layers.has("hazard") &&
          hazards.map((p) => (
            <Polygon
              key={p.id}
              positions={p.positions}
              pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.25, weight: 2 }}
            >
              <Popup>
                <strong>{p.label}</strong>
                <br />
                {sim ? "Data simulasi" : "Sumber resmi"}
              </Popup>
            </Polygon>
          ))}

        {layers.has("smoke") &&
          smoke.map((p) => (
            <Polygon
              key={p.id}
              positions={p.positions}
              pathOptions={{ color: "#57534e", fillColor: "#78716c", fillOpacity: 0.3, weight: 2, dashArray: "6 6" }}
            >
              <Popup>
                <strong>{p.label}</strong>
                <br />
                Indikatif, bukan hasil model dispersi atmosfer
              </Popup>
            </Polygon>
          ))}

        {layers.has("routes") &&
          snapshot.routes.flatMap((r) =>
            r.segments.map((seg, i) => (
              <Polyline
                key={`${r.id}-${i}`}
                positions={seg.positions}
                pathOptions={{ color: roadColor[seg.status], weight: 5, dashArray: roadDash[seg.status], opacity: 0.9 }}
              >
                <Popup>
                  <strong>{r.name}</strong>
                  <br />
                  Status ruas: {roadStatusLabel[seg.status]}
                  <br />
                  {seg.note}
                </Popup>
              </Polyline>
            )),
          )}

        {layers.has("hotspots") &&
          snapshot.hotspots.map((h) => (
            <Marker key={h.id} position={h.position} title="Titik panas" icon={shapeIcon("circle", confidenceColor[h.confidence], 16)}>
              <Popup>
                <strong>Titik panas</strong>
                <br />
                Sensor: {h.sensor}
                <br />
                Waktu: {formatDateTime(h.acquiredAt)}
                <br />
                Confidence: {h.confidence}, FRP {h.frp} MW
              </Popup>
            </Marker>
          ))}

        {layers.has("facilities") &&
          snapshot.facilities.map((f) => (
            <Marker
              key={f.id}
              position={f.position}
              title={`${facilityLabel[f.type]} ${f.name}`}
              icon={shapeIcon("square", f.exposed ? facilityExposedColor : facilityColor[f.type], 18)}
            >
              <Popup>
                <strong>{f.name}</strong>
                <br />
                {facilityLabel[f.type]}
                <br />
                {f.exposed ? "Terpapar zona bahaya" : "Di luar zona bahaya"}
                {f.distanceKm !== null && <> (jarak {f.distanceKm} km)</>}
                <br />
                Verifikasi: {f.verification}
              </Popup>
            </Marker>
          ))}

        {layers.has("shelters") &&
          snapshot.shelters.map((s) => (
            <Marker key={s.id} position={s.position} title={`Shelter ${s.name}`} icon={shapeIcon("diamond", "#047857", 16)}>
              <Popup>
                <strong>{s.name}</strong>
                <br />
                {s.capacity !== null ? `Kapasitas ${s.capacity} orang` : "Kapasitas belum terverifikasi"}
              </Popup>
            </Marker>
          ))}

        {layers.has("reports") &&
          snapshot.reports.map((r) => (
            <Marker
              key={r.id}
              position={r.position}
              title={`Laporan ${r.title}`}
              icon={shapeIcon("triangle", r.status === "verified" ? "#047857" : "#c2410c", 20)}
            >
              <Popup>
                <strong>{r.title}</strong>
                <br />
                {statusLabel[r.status]}
                <br />
                Tingkat: {urgencyLabel[r.severity]}
                <br />
                {r.reporterMasked}
              </Popup>
            </Marker>
          ))}

        {layers.has("earthquake") && snapshot.earthquake && (
          <Marker position={snapshot.earthquake.position} title={`Gempa M${snapshot.earthquake.magnitude}`} icon={shapeIcon("circle", "#111827", 22)}>
            <Popup>
              <strong>Gempa M{snapshot.earthquake.magnitude}</strong>
              <br />
              {snapshot.earthquake.region}
              <br />
              Kedalaman {snapshot.earthquake.depthKm} km
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
