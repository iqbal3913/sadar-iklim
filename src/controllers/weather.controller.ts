// src/controllers/weather.controller.ts
import "server-only";
import { z } from "zod";
import { getAlerts, getEarthquakes, getForecast } from "@/lib/bmkg/client";
import type { ForecastResult } from "@/lib/bmkg/parse";
import { envConfig } from "@/lib/env-config";
import { LIVE_CENTER, liveConditions } from "@/lib/mock/live";
import type {
  Earthquake,
  LatLng,
  WeatherAlert,
  WeatherSlot,
} from "@/lib/types";
import { ApiError, type FreshnessStatus } from "@/lib/api";
import {
  CACHE_TTL_MS,
  buildSourceCacheKey,
  withSourceCache,
} from "@/lib/cache";
import { recordSourceSnapshot } from "@/lib/supabase/admin";

const Adm4QuerySchema = z
  .string()
  .trim()
  .regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, "Kode wilayah adm4 tidak valid");

const CoordinateQuerySchema = z.object({
  lat: z.coerce.number().min(-11).max(6),
  lon: z.coerce.number().min(95).max(141),
});

export interface MarineHourlySlot {
  time: string;
  waveHeightM: number;
  waveDirectionDeg: number | null;
  wavePeriodS: number;
  swellWaveHeightM: number | null;
  swellWaveDirectionDeg: number | null;
  swellWavePeriodS: number | null;
}

export interface MarineForecastData {
  latitude: number;
  longitude: number;
  timezone: string;
  slots: MarineHourlySlot[];
}

export interface WeatherControllerEnvelope<T> {
  status: "LIVE" | "STALE";
  source: string;
  fetchedAt: string;
  sourceUpdatedAt: string;
  freshness: FreshnessStatus;
  data: T;
}

function parseOpenMeteoMarinePayload(
  raw: unknown,
  fallbackLat: number,
  fallbackLon: number,
): MarineForecastData {
  const root =
    raw !== null && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const hourly =
    root.hourly !== null && typeof root.hourly === "object"
      ? (root.hourly as Record<string, unknown>)
      : {};

  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const waveHeights = Array.isArray(hourly.wave_height)
    ? hourly.wave_height
    : [];
  const waveDirs = Array.isArray(hourly.wave_direction)
    ? hourly.wave_direction
    : [];
  const wavePeriods = Array.isArray(hourly.wave_period)
    ? hourly.wave_period
    : [];
  const swellHeights = Array.isArray(hourly.swell_wave_height)
    ? hourly.swell_wave_height
    : [];
  const swellDirs = Array.isArray(hourly.swell_wave_direction)
    ? hourly.swell_wave_direction
    : [];
  const swellPeriods = Array.isArray(hourly.swell_wave_period)
    ? hourly.swell_wave_period
    : [];

  const toFinite = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const slots: MarineHourlySlot[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const rawTime = typeof times[i] === "string" ? times[i] : "";
    if (!rawTime) continue;
    const parsedDate = new Date(
      /[zZ]|[+-]\d\d:?\d\d$/.test(rawTime) ? rawTime : `${rawTime}:00+08:00`,
    );
    if (Number.isNaN(parsedDate.getTime())) continue;

    const waveH = toFinite(waveHeights[i]) ?? 0;
    const waveP = toFinite(wavePeriods[i]) ?? 0;

    slots.push({
      time: parsedDate.toISOString(),
      waveHeightM: Math.round(waveH * 10) / 10,
      waveDirectionDeg: toFinite(waveDirs[i]),
      wavePeriodS: Math.round(waveP * 10) / 10,
      swellWaveHeightM: toFinite(swellHeights[i]),
      swellWaveDirectionDeg: toFinite(swellDirs[i]),
      swellWavePeriodS: toFinite(swellPeriods[i]),
    });
  }

  return {
    latitude: toFinite(root.latitude) ?? fallbackLat,
    longitude: toFinite(root.longitude) ?? fallbackLon,
    timezone:
      typeof root.timezone === "string" ? root.timezone : "Asia/Makassar",
    slots,
  };
}

export async function handleGetMarineForecast(input: {
  lat: number | string;
  lon: number | string;
}): Promise<WeatherControllerEnvelope<MarineForecastData>> {
  const parsed = CoordinateQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      "Koordinat latitude/longitude tidak valid untuk wilayah Indonesia",
    );
  }

  const roundedLat = Math.round(parsed.data.lat * 100) / 100;
  const roundedLon = Math.round(parsed.data.lon * 100) / 100;
  const gridKey = `${roundedLat},${roundedLon}`;
  const cacheKey = buildSourceCacheKey("OPEN_METEO_MARINE", gridKey);

  const endpointUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${roundedLat}&longitude=${roundedLon}&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period&timezone=Asia%2FMakassar&forecast_days=3&cell_selection=sea`;

  const cachedResult = await withSourceCache<MarineForecastData>({
    key: cacheKey,
    provider: "OPEN_METEO",
    ttlMs: CACHE_TTL_MS.OPEN_METEO_MARINE,
    loader: async (fetchedAt) => {
      const res = await fetch(endpointUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "SadarIklim/1.0 (IT RUSH 2026)",
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`Open-Meteo Marine merespons HTTP ${res.status}`);
      }
      const rawJson: unknown = await res.json();
      const data = parseOpenMeteoMarinePayload(rawJson, roundedLat, roundedLon);
      return { data, sourceUpdatedAt: fetchedAt };
    },
  });

  void recordSourceSnapshot({
    provider: "OPEN_METEO",
    sourceUrl: endpointUrl,
    regionKey: gridKey,
    fetchedAt: cachedResult.fetchedAt,
    sourceUpdatedAt: cachedResult.sourceUpdatedAt,
    freshness: cachedResult.freshness,
    checksum: cachedResult.checksum,
  });

  return {
    status: cachedResult.status,
    source: "OPEN_METEO",
    fetchedAt: cachedResult.fetchedAt,
    sourceUpdatedAt: cachedResult.sourceUpdatedAt,
    freshness: cachedResult.freshness,
    data: cachedResult.data,
  };
}

function mergeMarineIntoWeatherSlots(
  slots: WeatherSlot[],
  marineSlots: MarineHourlySlot[],
): WeatherSlot[] {
  if (marineSlots.length === 0) return slots;

  return slots.map((slot) => {
    const targetMs = new Date(slot.time).getTime();
    if (Number.isNaN(targetMs)) return slot;

    let closest: MarineHourlySlot | null = null;
    let minDiff = Infinity;

    for (const m of marineSlots) {
      const mMs = new Date(m.time).getTime();
      const diff = Math.abs(mMs - targetMs);
      if (diff < minDiff && diff <= 3 * 60 * 60 * 1000) {
        minDiff = diff;
        closest = m;
      }
    }

    if (!closest) return slot;

    return {
      ...slot,
      waveM: closest.waveHeightM,
      wavePeriodS: closest.wavePeriodS,
    };
  });
}

export async function handleGetWeatherForecast(
  rawAdm4?: string | null,
): Promise<WeatherControllerEnvelope<ForecastResult>> {
  const adm4 = (rawAdm4?.trim() || envConfig.bmkgAdm4).trim();
  const validAdm4 = Adm4QuerySchema.safeParse(adm4);
  if (!validAdm4.success) {
    throw new ApiError("BAD_REQUEST", "Kode wilayah adm4 tidak valid");
  }

  const targetAdm4 = validAdm4.data;
  const sourceUrl = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(targetAdm4)}`;

  try {
    const bmkgEnvelope = await getForecast(targetAdm4);
    const [lat, lon] = bmkgEnvelope.data.center;

    let enrichedSlots = bmkgEnvelope.data.conditions.slots;
    try {
      const marine = await handleGetMarineForecast({ lat, lon });
      enrichedSlots = mergeMarineIntoWeatherSlots(
        enrichedSlots,
        marine.data.slots,
      );
    } catch {
      // Kegagalan Open-Meteo Marine tidak menggagalkan prakiraan utama BMKG
    }

    const data: ForecastResult = {
      ...bmkgEnvelope.data,
      conditions: {
        ...bmkgEnvelope.data.conditions,
        slots: enrichedSlots,
      },
    };

    const freshness: "FRESH" | "STALE" =
      bmkgEnvelope.status === "LIVE" ? "FRESH" : "STALE";

    void recordSourceSnapshot({
      provider: "BMKG",
      sourceUrl,
      regionKey: targetAdm4,
      fetchedAt: bmkgEnvelope.fetchedAt,
      sourceUpdatedAt: data.conditions.sourceUpdatedAt,
      freshness,
    });

    return {
      status: bmkgEnvelope.status,
      source: "BMKG",
      fetchedAt: bmkgEnvelope.fetchedAt,
      sourceUpdatedAt: data.conditions.sourceUpdatedAt,
      freshness,
      data,
    };
  } catch {
    const fallbackData: ForecastResult = {
      conditions: liveConditions,
      center: LIVE_CENTER as LatLng,
      region: {
        adm4: targetAdm4,
        village: "Pasar Baru",
        district: "Teluk Segara",
        city: "Kota Bengkulu",
        province: "Bengkulu",
      },
    };

    return {
      status: "STALE",
      source: "BMKG",
      fetchedAt: liveConditions.fetchedAt,
      sourceUpdatedAt: liveConditions.sourceUpdatedAt,
      freshness: "STALE",
      data: fallbackData,
    };
  }
}

export async function handleGetWeatherAlerts(
  rawProvince?: string | null,
): Promise<WeatherControllerEnvelope<WeatherAlert[]>> {
  const province = (rawProvince ?? "").trim().slice(0, 60);
  const sourceUrl = "https://www.bmkg.go.id/alerts/nowcast/id";

  try {
    const bmkgAlerts = await getAlerts(province);
    const nowMs = Date.now();

    const activeAlerts = bmkgAlerts.data.filter((alert) => {
      const expiresIso = alert.detail?.expires;
      if (!expiresIso) return true;
      const expiresMs = new Date(expiresIso).getTime();
      return Number.isNaN(expiresMs) || expiresMs > nowMs;
    });

    const freshness: "FRESH" | "STALE" =
      bmkgAlerts.status === "LIVE" ? "FRESH" : "STALE";

    void recordSourceSnapshot({
      provider: "BMKG_CAP",
      sourceUrl,
      regionKey: province || "NATIONAL",
      fetchedAt: bmkgAlerts.fetchedAt,
      sourceUpdatedAt: bmkgAlerts.fetchedAt,
      freshness,
    });

    return {
      status: bmkgAlerts.status,
      source: "BMKG",
      fetchedAt: bmkgAlerts.fetchedAt,
      sourceUpdatedAt: bmkgAlerts.fetchedAt,
      freshness,
      data: activeAlerts,
    };
  } catch (error) {
    throw new ApiError(
      "UPSTREAM_TIMEOUT",
      error instanceof Error
        ? error.message
        : "Peringatan dini BMKG tidak dapat diambil",
    );
  }
}

export async function handleGetEarthquakes(): Promise<
  WeatherControllerEnvelope<{ latest: Earthquake; felt: Earthquake[] }>
> {
  const sourceUrl = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";

  try {
    const quakes = await getEarthquakes();
    const freshness: "FRESH" | "STALE" =
      quakes.status === "LIVE" ? "FRESH" : "STALE";

    void recordSourceSnapshot({
      provider: "BMKG_TEWS",
      sourceUrl,
      regionKey: "NATIONAL",
      fetchedAt: quakes.fetchedAt,
      sourceUpdatedAt: quakes.data.latest.occurredAt,
      freshness,
    });

    return {
      status: quakes.status,
      source: "BMKG",
      fetchedAt: quakes.fetchedAt,
      sourceUpdatedAt: quakes.data.latest.occurredAt,
      freshness,
      data: quakes.data,
    };
  } catch (error) {
    throw new ApiError(
      "UPSTREAM_TIMEOUT",
      error instanceof Error
        ? error.message
        : "Data gempa BMKG tidak dapat diambil",
    );
  }
}