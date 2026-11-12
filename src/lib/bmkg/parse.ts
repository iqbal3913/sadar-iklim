import { XMLParser } from "fast-xml-parser";
import type { Conditions, Earthquake, LatLng, Region, WeatherAlert, WeatherAlertDetail, WeatherSlot } from "../types";

export interface ForecastResult {
  conditions: Conditions;
  center: LatLng;
  region: Region;
}

const windName: Record<string, string> = {
  N: "Utara",
  NE: "Timur Laut",
  E: "Timur",
  SE: "Tenggara",
  S: "Selatan",
  SW: "Barat Daya",
  W: "Barat",
  NW: "Barat Laut",
};

function rec(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(str(v));
  return Number.isFinite(n) ? n : null;
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v];
}

function utcIso(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s.replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseForecast(json: unknown, now: Date, fetchedAt: string): ForecastResult {
  const root = rec(json);
  const lokasi = rec(root.lokasi);
  const first = rec(list(root.data)[0]);
  const entries = list(first.cuaca).flatMap((day) => list(day));
  const lat = num(lokasi.lat);
  const lon = num(lokasi.lon);
  if (entries.length === 0 || lat === null || lon === null) {
    throw new Error("Respons prakiraan BMKG tidak berisi data untuk kode wilayah ini");
  }

  const cutoff = now.getTime() - 3 * 60 * 60 * 1000;
  let analysis: string | null = null;
  const slots: WeatherSlot[] = [];
  for (const raw of entries) {
    const e = rec(raw);
    const time = utcIso(e.utc_datetime) ?? utcIso(e.datetime);
    const temp = num(e.t);
    if (!time || temp === null) continue;
    analysis = analysis ?? utcIso(e.analysis_date);
    if (new Date(time).getTime() < cutoff) continue;
    const ws = num(e.ws) ?? 0;
    const wd = str(e.wd);
    slots.push({
      time,
      description: str(e.weather_desc) || "Tidak tersedia",
      tempC: Math.round(temp),
      windMs: Math.round((ws / 3.6) * 10) / 10,
      windFrom: windName[wd] ?? (wd || "tidak tersedia"),
      cloudPct: Math.round(num(e.tcc) ?? 0),
      waveM: 0,
      wavePeriodS: 0,
    });
  }
  if (slots.length === 0) throw new Error("Prakiraan BMKG yang tersedia sudah kedaluwarsa");

  const village = str(lokasi.desa);
  const city = str(lokasi.kotkab);
  return {
    conditions: {
      regionName: [village, city].filter(Boolean).join(", "),
      fetchedAt,
      sourceUpdatedAt: analysis ?? fetchedAt,
      slots: slots.slice(0, 8),
    },
    center: [lat, lon],
    region: {
      adm4: str(lokasi.adm4),
      village,
      district: str(lokasi.kecamatan),
      city,
      province: str(lokasi.provinsi),
    },
  };
}

function parseQuake(raw: unknown): Earthquake | null {
  const g = rec(raw);
  const [la, lo] = str(g.Coordinates).split(",").map((p) => parseFloat(p));
  const magnitude = num(g.Magnitude);
  const occurredAt = utcIso(g.DateTime);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || magnitude === null || !occurredAt) return null;
  const shakemap = str(g.Shakemap);
  return {
    magnitude,
    depthKm: num(g.Kedalaman) ?? 0,
    region: str(g.Wilayah),
    occurredAt,
    position: [la, lo],
    potential: str(g.Potensi),
    felt: str(g.Dirasakan),
    shakemapUrl: /^[\w.-]+$/.test(shakemap) ? `https://static.bmkg.go.id/${shakemap}` : null,
  };
}

export function parseLatestQuake(json: unknown) {
  const q = parseQuake(rec(rec(json).Infogempa).gempa);
  if (!q) throw new Error("Respons gempa BMKG tidak dapat dibaca");
  return q;
}

export function parseQuakeList(json: unknown) {
  return list(rec(rec(json).Infogempa).gempa)
    .map(parseQuake)
    .filter((q): q is Earthquake => q !== null);
}

const xml = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true });

function isoOrNull(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseAlertFeed(text: string): Omit<WeatherAlert, "inRegion" | "detail">[] {
  const channel = rec(rec(xml.parse(text).rss).channel);
  return list(channel.item)
    .map((raw) => {
      const i = rec(raw);
      const link = str(i.link);
      return {
        id: link.split("/").pop()?.replace(/_alert\.xml$/, "") || str(i.title),
        title: str(i.title),
        link,
        description: str(i.description),
        publishedAt: isoOrNull(i.pubDate),
      };
    })
    .filter((a) => a.title !== "");
}

function parsePolygon(v: unknown): LatLng[] {
  return str(v)
    .split(/\s+/)
    .map((pair) => pair.split(",").map((p) => parseFloat(p)))
    .filter((p): p is [number, number] => p.length === 2 && p.every((n) => Number.isFinite(n)))
    .map(([la, lo]) => [la, lo] as LatLng);
}

export function parseCap(text: string): WeatherAlertDetail {
  const info = rec(list(rec(xml.parse(text).alert).info)[0]);
  if (!str(info.headline) && !str(info.event)) throw new Error("Dokumen CAP BMKG tidak dapat dibaca");
  const polygons = list(info.area)
    .flatMap((a) => list(rec(a).polygon))
    .map(parsePolygon)
    .filter((p) => p.length >= 3);
  return {
    event: str(info.event),
    headline: str(info.headline),
    description: str(info.description),
    effective: isoOrNull(info.effective),
    expires: isoOrNull(info.expires),
    severity: str(info.severity),
    urgency: str(info.urgency),
    certainty: str(info.certainty),
    sender: str(info.senderName),
    web: /^https:\/\//.test(str(info.web)) ? str(info.web) : null,
    polygons,
  };
}
