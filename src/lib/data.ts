import type {
  Conditions,
  Earthquake,
  Facility,
  HazardPolygon,
  Hotspot,
  IbfBulletin,
  LatLng,
  Region,
  Report,
  RouteCandidate,
  Scenario,
  Shelter,
  SourceStatus,
  WeatherAlert,
} from "./types";
import {
  LIVE_CENTER,
  LIVE_ZOOM,
  liveBulletin,
  liveConditions,
  liveFacilities,
  liveReports,
  liveShelters,
} from "./mock/live";
import { getScenario, scenarios } from "./mock/scenarios";
import { campaigns, mangroveAudits } from "./mock/campaigns";
import { samplePhotos } from "./mock/samples";

export interface Snapshot {
  mode: "LIVE" | "SIMULATION";
  scenarioCode: string | null;
  center: LatLng;
  zoom: number;
  conditions: Conditions;
  bulletin: IbfBulletin;
  hotspots: Hotspot[];
  facilities: Facility[];
  reports: Report[];
  polygons: HazardPolygon[];
  shelters: Shelter[];
  routes: RouteCandidate[];
  earthquake: Earthquake | null;
  windVector: { fromDeg: number; speedMs: number } | null;
  alerts: WeatherAlert[];
  sources: SourceStatus[];
  region: Region | null;
}

export interface LiveData {
  forecast: { status: "LIVE" | "STALE"; fetchedAt: string; conditions: Conditions; center: LatLng; region: Region } | null;
  earthquakes: { status: "LIVE" | "STALE"; fetchedAt: string; latest: Earthquake; felt: Earthquake[] } | null;
  alerts: { status: "LIVE" | "STALE"; fetchedAt: string; items: WeatherAlert[] } | null;
  errors: Partial<Record<"forecast" | "earthquakes" | "alerts", string>>;
  loading: boolean;
}

export const emptyLiveData: LiveData = { forecast: null, earthquakes: null, alerts: null, errors: {}, loading: true };

function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function sourceOf(
  key: "forecast" | "earthquakes" | "alerts",
  label: string,
  live: LiveData,
  updatedAt: string | null,
): SourceStatus {
  const part = live[key];
  if (part) return { key, label, status: part.status, updatedAt, note: null };
  if (live.errors[key]) return { key, label, status: "ERROR", updatedAt: null, note: live.errors[key] ?? null };
  return { key, label, status: "LOADING", updatedAt: null, note: null };
}

export function mergeLive(base: Snapshot, live: LiveData): Snapshot {
  const center = live.forecast?.center ?? base.center;
  const near = <T extends { position: LatLng }>(items: T[]) =>
    live.forecast ? items.filter((i) => distanceKm(i.position, center) <= 50) : items;
  return {
    ...base,
    center,
    conditions: live.forecast?.conditions ?? base.conditions,
    region: live.forecast?.region ?? null,
    earthquake: live.earthquakes?.latest ?? null,
    alerts: live.alerts?.items ?? [],
    facilities: near(base.facilities),
    shelters: near(base.shelters),
    reports: near(base.reports),
    sources: [
      sourceOf("forecast", "Prakiraan BMKG", live, live.forecast?.conditions.sourceUpdatedAt ?? null),
      sourceOf("earthquakes", "Gempa BMKG", live, live.earthquakes?.latest.occurredAt ?? null),
      sourceOf("alerts", "Peringatan dini BMKG", live, live.alerts?.fetchedAt ?? null),
      { key: "sample", label: "Data lain", status: "SAMPLE", updatedAt: null, note: null },
    ],
  };
}

export function getLiveSnapshot(): Snapshot {
  return {
    mode: "LIVE",
    scenarioCode: null,
    center: LIVE_CENTER,
    zoom: LIVE_ZOOM,
    conditions: liveConditions,
    bulletin: liveBulletin,
    hotspots: [],
    facilities: liveFacilities,
    reports: liveReports,
    polygons: [],
    shelters: liveShelters,
    routes: [],
    earthquake: null,
    windVector: null,
    alerts: [],
    sources: [],
    region: null,
  };
}

export function getScenarioSnapshot(code: string): Snapshot {
  const s: Scenario = getScenario(code) ?? scenarios[0];
  return {
    mode: "SIMULATION",
    scenarioCode: s.code,
    center: s.center,
    zoom: s.zoom,
    conditions: s.conditions,
    bulletin: s.bulletin,
    hotspots: s.hotspots,
    facilities: s.facilities,
    reports: s.reports,
    polygons: s.polygons,
    shelters: s.shelters,
    routes: s.routes,
    earthquake: s.earthquake,
    windVector: s.windVector,
    alerts: [],
    sources: [{ key: "sample", label: "Semua data pada skenario ini", status: "SIMULATION", updatedAt: null, note: null }],
    region: null,
  };
}

export function listScenarios(): Scenario[] {
  return scenarios;
}

export function listCampaigns() {
  return campaigns;
}

export function listMangroveAudits() {
  return mangroveAudits;
}

export function listSamplePhotos() {
  return samplePhotos;
}
