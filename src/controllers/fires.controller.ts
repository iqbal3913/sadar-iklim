// src/controllers/fires.controller.ts
import "server-only";
import {
  booleanPointInPolygon,
  destination,
  distance,
  point,
  polygon,
} from "@turf/turf";
import { z } from "zod";
import { ApiError, type FreshnessStatus } from "@/lib/api";
import {
  CACHE_TTL_MS,
  buildSourceCacheKey,
  withSourceCache,
} from "@/lib/cache";
import { envConfig, hasFirmsConfig } from "@/lib/env-config";
import { liveFacilities } from "@/lib/mock/live";
import { getScenario } from "@/lib/mock/scenarios";
import {
  getSupabaseAdminClient,
  recordAuditLog,
  recordSourceSnapshot,
} from "@/lib/supabase/admin";
import { requireServerRole } from "@/lib/supabase/server";
import type {
  Facility,
  FacilityType,
  HazardPolygon,
  Hotspot,
  LatLng,
} from "@/lib/types";

const BboxQuerySchema = z.object({
  west: z.coerce.number().min(94).max(142).default(101.5),
  south: z.coerce.number().min(-11).max(7).default(-4.5),
  east: z.coerce.number().min(94).max(142).default(106.0),
  north: z.coerce.number().min(-11).max(7).default(-2.5),
  dayRange: z.coerce.number().int().min(1).max(5).default(2),
  sensor: z
    .enum([
      "VIIRS_SNPP_NRT",
      "VIIRS_NOAA20_NRT",
      "VIIRS_NOAA21_NRT",
      "MODIS_NRT",
    ])
    .default("VIIRS_SNPP_NRT"),
  windFromDeg: z.coerce.number().min(0).max(360).default(135),
  windSpeedMs: z.coerce.number().min(0).max(60).default(5.5),
});

const UpdateFacilityVerificationSchema = z.object({
  id: z.string().trim().min(1),
  verification: z.enum(["unverified", "checked", "confirmed"]),
  exposed: z.boolean().optional(),
  note: z.string().trim().max(400).optional(),
});

export interface FiresIntelligencePayload {
  hotspots: Hotspot[];
  smokeCorridors: HazardPolygon[];
  facilities: Facility[];
  windVector: {
    fromDeg: number;
    downwindDeg: number;
    speedMs: number;
  };
  methodologyNote: string;
}

export interface FiresControllerResult {
  status: "LIVE" | "STALE" | "SIMULATION";
  freshness: FreshnessStatus;
  fetchedAt: string;
  sourceUpdatedAt: string;
  data: FiresIntelligencePayload;
}

/**
 * Mengonversi arah asal angin meteorologi (degrees from) menjadi arah rambatan downwind (degrees to)
 * sesuai aturan domain PRD Bab 4.3.3: downwind = (fromDeg + 180) % 360.
 */
export function computeDownwindBearing(windFromDeg: number): number {
  const normalized = ((windFromDeg % 360) + 360) % 360;
  return Math.round(((normalized + 180) % 360) * 10) / 10;
}

function normalizeFirmsConfidence(raw: string): "low" | "nominal" | "high" {
  const clean = raw.trim().toLowerCase();
  if (clean === "h" || clean === "high") return "high";
  if (clean === "l" || clean === "low") return "low";
  const num = Number(clean);
  if (Number.isFinite(num)) {
    if (num >= 80) return "high";
    if (num < 40) return "low";
  }
  return "nominal";
}

function parseFirmsAcqDateTime(acqDate: string, acqTime: string): string {
  const cleanDate = acqDate.trim();
  const paddedTime = acqTime.trim().padStart(4, "0");
  const hh = paddedTime.slice(0, 2);
  const mm = paddedTime.slice(2, 4);
  const isoCandidate = `${cleanDate}T${hh}:${mm}:00Z`;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

/**
 * Mem-parsing teks CSV dari NASA FIRMS Area API menjadi daftar Hotspot terstandar.
 */
export function parseFirmsCsv(
  csvText: string,
  defaultSensor: string,
): Hotspot[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idxLat = headers.indexOf("latitude");
  const idxLon = headers.indexOf("longitude");
  const idxDate = headers.indexOf("acq_date");
  const idxTime = headers.indexOf("acq_time");
  const idxConf = headers.indexOf("confidence");
  const idxFrp = headers.indexOf("frp");
  const idxInstrument = headers.indexOf("instrument");

  if (idxLat === -1 || idxLon === -1) return [];

  const hotspots: Hotspot[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",");
    const lat = parseFloat(cols[idxLat] ?? "");
    const lon = parseFloat(cols[idxLon] ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const acqDate = idxDate !== -1 ? (cols[idxDate] ?? "") : "";
    const acqTime = idxTime !== -1 ? (cols[idxTime] ?? "") : "";
    const confRaw = idxConf !== -1 ? (cols[idxConf] ?? "nominal") : "nominal";
    const frpVal = idxFrp !== -1 ? parseFloat(cols[idxFrp] ?? "0") : 0;
    const sensorName =
      idxInstrument !== -1 && cols[idxInstrument]
        ? cols[idxInstrument].trim()
        : defaultSensor;

    hotspots.push({
      id: `firms-${i}-${lat.toFixed(3)}-${lon.toFixed(3)}`,
      position: [lat, lon],
      sensor: sensorName,
      acquiredAt: parseFirmsAcqDateTime(acqDate, acqTime),
      confidence: normalizeFirmsConfidence(confRaw),
      frp: Number.isFinite(frpVal) ? Math.round(frpVal * 10) / 10 : 0,
    });
  }

  return hotspots.slice(0, 250);
}

/**
 * Membangun koridor asap indikatif (6 jam & 12 jam) secara deterministik dari titik pusat klaster hotspot
 * ke arah downwind menggunakan Turf.js sesuai PRD Bab 4.3.3.
 */
export function buildIndicativeSmokeCorridors(params: {
  hotspots: Hotspot[];
  windFromDeg: number;
  windSpeedMs: number;
}): HazardPolygon[] {
  const { hotspots, windFromDeg, windSpeedMs } = params;
  const activeHotspots = hotspots.filter((h) => h.confidence !== "low");
  if (activeHotspots.length === 0 || windSpeedMs <= 0.2) {
    return [];
  }

  const avgLat =
    activeHotspots.reduce((acc, h) => acc + h.position[0], 0) /
    activeHotspots.length;
  const avgLon =
    activeHotspots.reduce((acc, h) => acc + h.position[1], 0) /
    activeHotspots.length;

  const downwindDeg = computeDownwindBearing(windFromDeg);
  const originPt = point([avgLon, avgLat]);

  // Jarak jangkauan heuristik (dibatasi agar tetap lokal & realistis untuk visualisasi kewaspadaan)
  const dist6hKm = Math.min(25, Math.max(4, windSpeedMs * 3.6 * 0.35));
  const dist12hKm = Math.min(45, Math.max(8, windSpeedMs * 3.6 * 0.65));

  const leftBearing = (downwindDeg - 90 + 360) % 360;
  const rightBearing = (downwindDeg + 90) % 360;

  const startLeft = destination(originPt, 1.5, leftBearing, {
    units: "kilometers",
  });
  const startRight = destination(originPt, 1.5, rightBearing, {
    units: "kilometers",
  });

  const midCenter = destination(originPt, dist6hKm, downwindDeg, {
    units: "kilometers",
  });
  const midLeft = destination(midCenter, 4.0, leftBearing, {
    units: "kilometers",
  });
  const midRight = destination(midCenter, 4.0, rightBearing, {
    units: "kilometers",
  });

  const farCenter = destination(originPt, dist12hKm, downwindDeg, {
    units: "kilometers",
  });
  const farLeft = destination(farCenter, 6.5, leftBearing, {
    units: "kilometers",
  });
  const farRight = destination(farCenter, 6.5, rightBearing, {
    units: "kilometers",
  });

  const toLatLng = (pt: ReturnType<typeof destination>): LatLng => [
    Math.round(pt.geometry.coordinates[1] * 10000) / 10000,
    Math.round(pt.geometry.coordinates[0] * 10000) / 10000,
  ];

  return [
    {
      id: "plume-6h",
      label: "Koridor asap indikatif 6 jam (heuristik)",
      kind: "smoke_corridor",
      positions: [
        toLatLng(startLeft),
        toLatLng(midLeft),
        toLatLng(midRight),
        toLatLng(startRight),
      ],
      source: "INTERNAL_RULE",
      indicative: true,
    },
    {
      id: "plume-12h",
      label: "Koridor asap indikatif 12 jam (heuristik)",
      kind: "smoke_corridor",
      positions: [
        toLatLng(midLeft),
        toLatLng(farLeft),
        toLatLng(farRight),
        toLatLng(midRight),
      ],
      source: "INTERNAL_RULE",
      indicative: true,
    },
  ];
}

/**
 * Mengevaluasi paparan fasilitas kritis secara deterministik terhadap poligon bahaya/koridor asap
 * dan menghitung jarak terdekat ke titik panas atau poligon bahaya menggunakan Turf.js (PRD Bab 4.3.3).
 */
export function evaluateFacilitiesExposure(params: {
  facilities: Facility[];
  polygons: HazardPolygon[];
  hotspots: Hotspot[];
}): Facility[] {
  const { facilities, polygons, hotspots } = params;

  const turfPolygons = polygons
    .filter((p) => p.positions.length >= 3)
    .map((p) => {
      const ring = p.positions.map(([lat, lon]) => [lon, lat]);
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
      return polygon([ring]);
    });

  return facilities.map((fac) => {
    const [fLat, fLon] = fac.position;
    if (!Number.isFinite(fLat) || !Number.isFinite(fLon)) {
      return fac;
    }

    const facPt = point([fLon, fLat]);
    const insidePolygon = turfPolygons.some((poly) =>
      booleanPointInPolygon(facPt, poly),
    );

    let minHotspotDistKm: number | null = null;
    for (const h of hotspots) {
      const d = distance(facPt, point([h.position[1], h.position[0]]), {
        units: "kilometers",
      });
      if (minHotspotDistKm === null || d < minHotspotDistKm) {
        minHotspotDistKm = d;
      }
    }

    const roundedDistKm =
      minHotspotDistKm !== null
        ? Math.round(minHotspotDistKm * 10) / 10
        : fac.distanceKm;

    const exposedByProximity =
      minHotspotDistKm !== null && minHotspotDistKm <= 5.0;

    return {
      ...fac,
      exposed: insidePolygon || exposedByProximity || fac.exposed,
      distanceKm: roundedDistKm,
    };
  });
}

function parsePointCoordinate(
  rawLocation: unknown,
  fallback: LatLng = [-3.8, 102.262],
): LatLng {
  if (typeof rawLocation === "string") {
    const wktMatch = /POINT\s*\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)/i.exec(
      rawLocation,
    );
    if (wktMatch) {
      const lon = parseFloat(wktMatch[1]);
      const lat = parseFloat(wktMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return [lat, lon];
      }
    }
  }
  return fallback;
}

/**
 * Mengambil daftar fasilitas kritis dari Supabase `public.critical_facilities` (atau fallback `liveFacilities`)
 * dan menghitung status keterpaparan terhadap poligon bahaya aktif.
 */
export async function handleListFacilities(options?: {
  mode?: string | null;
  scenarioCode?: string | null;
  adm4?: string | null;
}): Promise<Facility[]> {
  const isSim = (options?.mode ?? "live").toLowerCase() === "simulation";
  if (isSim) {
    const scenario = getScenario(options?.scenarioCode || "KARHUTLA-GAMBUT-02");
    if (!scenario) return [];
    return evaluateFacilitiesExposure({
      facilities: scenario.facilities,
      polygons: scenario.polygons,
      hotspots: scenario.hotspots,
    });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return liveFacilities;
  }

  try {
    let query = admin
      .from("critical_facilities")
      .select("*")
      .neq("verification_status", "inactive")
      .limit(200);

    if (options?.adm4) {
      query = query.eq("adm4_code", options.adm4.trim());
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return liveFacilities;
    }

    return data.map((row) => {
      const r = row as Record<string, unknown>;
      const rawType = String(r.facility_type ?? "school");
      const validType: FacilityType =
        rawType === "school" ||
        rawType === "puskesmas" ||
        rawType === "hospital"
          ? rawType
          : "school";

      const rawVer = String(r.verification_status ?? "unverified");
      const verification: Facility["verification"] =
        rawVer === "checked" || rawVer === "confirmed" ? rawVer : "unverified";

      return {
        id: String(r.id),
        name: String(r.name ?? "Fasilitas"),
        type: validType,
        position: parsePointCoordinate(r.location),
        verification,
        verifiedAt: r.last_verified_at ? String(r.last_verified_at) : null,
        exposed: Boolean(
          (r.source_attributes as Record<string, unknown> | null)?.exposed,
        ),
        distanceKm: null,
      };
    });
  } catch {
    return liveFacilities;
  }
}

/**
 * Memperbarui status verifikasi fasilitas kritis oleh Petugas BPBD dan mencatatnya ke `audit_logs` (PRD Bab 4.3.3).
 */
export async function handleUpdateFacilityStatus(
  request: Request,
  rawBody: unknown,
): Promise<{
  id: string;
  verification: Facility["verification"];
  verifiedAt: string;
}> {
  const officer = await requireServerRole(request, [
    "bpbd_admin",
    "super_admin",
  ]);
  const parsed = UpdateFacilityVerificationSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      "Parameter pembaruan fasilitas kritis tidak valid",
    );
  }

  const { id, verification, exposed, note } = parsed.data;
  const verifiedAt = new Date().toISOString();

  const admin = getSupabaseAdminClient();
  if (admin && !officer.isDemoAccount) {
    try {
      await admin
        .from("critical_facilities")
        .update({
          verification_status: verification,
          last_verified_at: verifiedAt,
        })
        .eq("id", id);
    } catch {
      // Lanjutkan pencatatan audit meskipun ID berasal dari data contoh lokal
    }
  }

  void recordAuditLog({
    actorId: officer.isDemoAccount ? null : officer.id,
    actorRole: officer.role,
    action: "VERIFY_CRITICAL_FACILITY",
    entityType: "critical_facilities",
    entityId: id,
    afterState: { verification, exposed, verifiedAt },
    reason: note ?? null,
  });

  return { id, verification, verifiedAt };
}

/**
 * Mengambil intelijen titik panas NASA FIRMS, membangun koridor asap indikatif downwind,
 * dan menghitung irisan fasilitas kritis sesuai PRD Bab 4.3.
 */
export async function handleGetFiresIntelligence(
  rawQuery: Record<string, string | null | undefined>,
): Promise<FiresControllerResult> {
  const mode = (rawQuery.mode ?? "live").toLowerCase();
  if (mode === "simulation" || rawQuery.scenario) {
    const scenarioCode = rawQuery.scenario?.trim() || "KARHUTLA-GAMBUT-02";
    const scenario =
      getScenario(scenarioCode) ?? getScenario("KARHUTLA-GAMBUT-02");
    if (!scenario) {
      throw new ApiError("NOT_FOUND", "Skenario karhutla tidak ditemukan");
    }

    const fromDeg = scenario.windVector?.fromDeg ?? 135;
    const speedMs = scenario.windVector?.speedMs ?? 5.5;
    const downwindDeg = computeDownwindBearing(fromDeg);

    const smokeCorridors = scenario.polygons.filter(
      (p) => p.kind === "smoke_corridor",
    );
    const evaluatedFacilities = evaluateFacilitiesExposure({
      facilities: scenario.facilities,
      polygons: smokeCorridors,
      hotspots: scenario.hotspots,
    });

    return {
      status: "SIMULATION",
      freshness: "FRESH",
      fetchedAt: scenario.conditions.fetchedAt,
      sourceUpdatedAt: scenario.conditions.sourceUpdatedAt,
      data: {
        hotspots: scenario.hotspots,
        smokeCorridors,
        facilities: evaluatedFacilities,
        windVector: {
          fromDeg,
          downwindDeg,
          speedMs,
        },
        methodologyNote:
          "Koridor asap dihitung dengan aturan heuristik downwind (arah asal angin + 180°), bukan model dispersi atmosfer HYSPLIT/WRF-Chem",
      },
    };
  }

  const parsed = BboxQuerySchema.safeParse({
    west: rawQuery.west ?? undefined,
    south: rawQuery.south ?? undefined,
    east: rawQuery.east ?? undefined,
    north: rawQuery.north ?? undefined,
    dayRange: rawQuery.days ?? undefined,
    sensor: rawQuery.sensor ?? undefined,
    windFromDeg: rawQuery.windFromDeg ?? undefined,
    windSpeedMs: rawQuery.windSpeedMs ?? undefined,
  });

  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      "Parameter bounding box atau sensor FIRMS tidak valid",
    );
  }

  const q = parsed.data;
  const downwindDeg = computeDownwindBearing(q.windFromDeg);
  const baseFacilities = await handleListFacilities({ mode: "live" });

  // Jika FIRMS_MAP_KEY belum dikonfigurasi, kembalikan status kosong yang jujur tanpa mengarang hotspot live
  if (!hasFirmsConfig()) {
    const nowIso = new Date().toISOString();
    return {
      status: "LIVE",
      freshness: "FRESH",
      fetchedAt: nowIso,
      sourceUpdatedAt: nowIso,
      data: {
        hotspots: [],
        smokeCorridors: [],
        facilities: baseFacilities,
        windVector: {
          fromDeg: q.windFromDeg,
          downwindDeg,
          speedMs: q.windSpeedMs,
        },
        methodologyNote:
          "FIRMS_MAP_KEY belum dikonfigurasi pada server; gunakan mode Simulasi KARHUTLA-GAMBUT-02 untuk menguji titik panas dan koridor asap indikatif",
      },
    };
  }

  const bboxString = `${q.west},${q.south},${q.east},${q.north}`;
  const cacheKey = buildSourceCacheKey(
    "NASA_FIRMS",
    `${q.sensor}:${bboxString}:${q.dayRange}`,
  );
  const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(envConfig.firms.mapKey)}/${q.sensor}/${bboxString}/${q.dayRange}`;

  const cached = await withSourceCache<Hotspot[]>({
    key: cacheKey,
    provider: "NASA_FIRMS",
    ttlMs: CACHE_TTL_MS.NASA_FIRMS,
    loader: async (fetchedAt) => {
      const res = await fetch(firmsUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(9000),
        headers: {
          "User-Agent": "SadarIklim/1.0 (IT RUSH 2026)",
          Accept: "text/csv, text/plain, */*",
        },
      });
      if (!res.ok) {
        throw new Error(`NASA FIRMS merespons HTTP ${res.status}`);
      }
      const csvText = await res.text();
      const hotspots = parseFirmsCsv(csvText, q.sensor);
      const latestAcq = hotspots[0]?.acquiredAt ?? fetchedAt;
      return { data: hotspots, sourceUpdatedAt: latestAcq };
    },
  });

  void recordSourceSnapshot({
    provider: "NASA_FIRMS",
    sourceUrl: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/[REDACTED]/${q.sensor}/${bboxString}/${q.dayRange}`,
    regionKey: bboxString,
    fetchedAt: cached.fetchedAt,
    sourceUpdatedAt: cached.sourceUpdatedAt,
    freshness: cached.freshness,
    checksum: cached.checksum,
  });

  const smokeCorridors = buildIndicativeSmokeCorridors({
    hotspots: cached.data,
    windFromDeg: q.windFromDeg,
    windSpeedMs: q.windSpeedMs,
  });

  const evaluatedFacilities = evaluateFacilitiesExposure({
    facilities: baseFacilities,
    polygons: smokeCorridors,
    hotspots: cached.data,
  });

  return {
    status: cached.status,
    freshness: cached.freshness,
    fetchedAt: cached.fetchedAt,
    sourceUpdatedAt: cached.sourceUpdatedAt,
    data: {
      hotspots: cached.data,
      smokeCorridors,
      facilities: evaluatedFacilities,
      windVector: {
        fromDeg: q.windFromDeg,
        downwindDeg,
        speedMs: q.windSpeedMs,
      },
      methodologyNote:
        "Koridor asap bersifat indikatif dari vektor angin downwind (arah asal + 180°), bukan model dispersi atmosfer",
    },
  };
}