import "server-only";
import type { WeatherAlert } from "../types";
import { parseAlertFeed, parseCap, parseForecast, parseLatestQuake, parseQuakeList } from "./parse";

export interface Envelope<T> {
  status: "LIVE" | "STALE";
  source: "BMKG";
  fetchedAt: string;
  data: T;
}

const cache = new Map<string, { at: number; fetchedAt: string; data: unknown }>();

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "SadarIklim/0.1 (IT RUSH 2026)", Accept: "application/json, application/xml, text/xml, */*" },
  }).catch(() => {
    throw new Error("BMKG tidak dapat dijangkau dari server");
  });
  if (!res.ok) throw new Error(`BMKG merespons ${res.status}`);
  return res.text();
}

async function cached<T>(key: string, ttlMs: number, load: (fetchedAt: string) => Promise<T>): Promise<Envelope<T>> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) {
    return { status: "LIVE", source: "BMKG", fetchedAt: hit.fetchedAt, data: hit.data as T };
  }
  try {
    const fetchedAt = new Date().toISOString();
    const data = await load(fetchedAt);
    cache.set(key, { at: Date.now(), fetchedAt, data });
    return { status: "LIVE", source: "BMKG", fetchedAt, data };
  } catch (error) {
    if (hit) return { status: "STALE", source: "BMKG", fetchedAt: hit.fetchedAt, data: hit.data as T };
    throw error;
  }
}

const minute = 60 * 1000;

export function getForecast(adm4: string) {
  return cached(`forecast:${adm4}`, 30 * minute, async (fetchedAt) =>
    parseForecast(
      JSON.parse(await fetchText(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`)),
      new Date(),
      fetchedAt,
    ),
  );
}

export function getEarthquakes() {
  return cached("earthquakes", 2 * minute, async () => {
    const [latest, felt] = await Promise.all([
      fetchText("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json"),
      fetchText("https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json").catch(() => null),
    ]);
    return {
      latest: parseLatestQuake(JSON.parse(latest)),
      felt: felt ? parseQuakeList(JSON.parse(felt)).slice(0, 5) : [],
    };
  });
}

const capLink = /^https:\/\/www\.bmkg\.go\.id\/alerts\/nowcast\/id\/[\w.-]+_alert\.xml$/;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function getAlerts(province: string) {
  const needle = normalize(province);
  return cached(`alerts:${needle}`, 3 * minute, async () => {
    const feed = parseAlertFeed(await fetchText("https://www.bmkg.go.id/alerts/nowcast/id"));
    const alerts: WeatherAlert[] = feed.map((a) => ({
      ...a,
      inRegion: needle !== "" && (normalize(a.title) === needle || normalize(a.title).endsWith(` ${needle}`)),
      detail: null,
    }));
    await Promise.all(
      alerts
        .filter((a) => a.inRegion && capLink.test(a.link))
        .slice(0, 3)
        .map(async (a) => {
          a.detail = await fetchText(a.link).then(parseCap).catch(() => null);
        }),
    );
    return alerts;
  });
}
