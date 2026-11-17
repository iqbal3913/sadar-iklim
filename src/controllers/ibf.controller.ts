// src/controllers/ibf.controller.ts
import "server-only";
import {
  handleGetEarthquakes,
  handleGetWeatherAlerts,
  handleGetWeatherForecast,
} from "@/controllers/weather.controller";
import {
  AI_FEATURE_KEYS,
  IBFBulletinSchema,
  IBF_SYSTEM_INSTRUCTION,
  type IBFBulletin,
  type IbfPromptEvidenceInput,
  type IbfPromptRouteInput,
  applyIBFBulletinGuard,
  buildIBFBulletinPrompt,
  generateStructuredWithMeta,
  mapIBFBulletinToUi,
} from "@/lib/ai";
import { ApiError, type FreshnessStatus } from "@/lib/api";
import { buildSourceCacheKey, withSourceCache } from "@/lib/cache";
import { envConfig, hasGeminiConfig } from "@/lib/env-config";
import { liveBulletin, liveFacilities } from "@/lib/mock/live";
import { getScenario } from "@/lib/mock/scenarios";
import { recordAiAnalysisRun } from "@/lib/supabase/admin";
import type {
  Conditions,
  Earthquake,
  EvidenceItem,
  Facility,
  HazardType,
  IbfAction,
  IbfBulletin,
  ImpactLevel,
  Region,
  RouteCandidate,
  WeatherAlert,
} from "@/lib/types";

export interface IbfControllerResult {
  status: "LIVE" | "STALE" | "SIMULATION";
  freshness: FreshnessStatus;
  fetchedAt: string;
  sourceUpdatedAt: string;
  aiGenerated: boolean;
  data: {
    bulletin: IbfBulletin;
    rawContract: IBFBulletin | null;
    conditions: Conditions;
    region: Region | null;
    alerts: WeatherAlert[];
    earthquake: Earthquake | null;
    exposedFacilitiesCount: number;
  };
}

/**
 * Ambang operasional deterministik untuk keselamatan pelayaran perahu kecil & pesisir (PRD Bab 4.1.3).
 */
const THRESHOLDS = {
  WAVE_MODERATE_M: 1.25,
  WAVE_HIGH_M: 2.0,
  WAVE_EXTREME_M: 3.0,
  WIND_MODERATE_MS: 6.0,
  WIND_HIGH_MS: 9.0,
  WIND_EXTREME_MS: 12.0,
  QUAKE_STRONG_MAG: 6.0,
} as const;

interface DeterministicEvaluation {
  impactLevel: ImpactLevel;
  schemaHazardType: IBFBulletin["hazard_type"];
  uiHazardType: HazardType;
  maxWaveM: number;
  maxWavePeriodS: number;
  maxWindMs: number;
  hasHeavyRain: boolean;
  activeRegionAlerts: WeatherAlert[];
  exposedFacilities: Facility[];
  evidenceList: IbfPromptEvidenceInput[];
}

function evaluateDeterministicImpact(params: {
  conditions: Conditions;
  alerts: WeatherAlert[];
  earthquake: Earthquake | null;
  facilities: Facility[];
  generatedAtIso: string;
}): DeterministicEvaluation {
  const { conditions, alerts, earthquake, facilities, generatedAtIso } = params;
  const slots = conditions.slots;

  const maxWaveM =
    slots.length > 0 ? Math.max(0, ...slots.map((s) => s.waveM)) : 0;
  const maxWavePeriodS =
    slots.length > 0 ? Math.max(0, ...slots.map((s) => s.wavePeriodS)) : 0;
  const maxWindMs =
    slots.length > 0 ? Math.max(0, ...slots.map((s) => s.windMs)) : 0;

  const hasHeavyRain = slots.some((s) => {
    const desc = s.description.toLowerCase();
    return (
      desc.includes("lebat") ||
      desc.includes("petir") ||
      desc.includes("ekstrem")
    );
  });

  const activeRegionAlerts = alerts.filter((a) => a.inRegion);
  const exposedFacilities = facilities.filter((f) => f.exposed);

  let impactLevel: ImpactLevel = "low";

  if (
    maxWaveM >= THRESHOLDS.WAVE_EXTREME_M ||
    maxWindMs >= THRESHOLDS.WIND_EXTREME_MS ||
    (earthquake && earthquake.magnitude >= 7.0) ||
    activeRegionAlerts.some(
      (a) => a.detail?.severity?.toLowerCase() === "extreme",
    )
  ) {
    impactLevel = "extreme";
  } else if (
    maxWaveM >= THRESHOLDS.WAVE_HIGH_M ||
    maxWindMs >= THRESHOLDS.WIND_HIGH_MS ||
    activeRegionAlerts.length > 0 ||
    hasHeavyRain
  ) {
    impactLevel = "high";
  } else if (
    maxWaveM >= THRESHOLDS.WAVE_MODERATE_M ||
    maxWindMs >= THRESHOLDS.WIND_MODERATE_MS ||
    exposedFacilities.length > 0
  ) {
    impactLevel = "moderate";
  }

  let schemaHazardType: IBFBulletin["hazard_type"] = "coastal_flood";
  let uiHazardType: HazardType = "coastal_flood";

  if (earthquake && earthquake.magnitude >= THRESHOLDS.QUAKE_STRONG_MAG) {
    schemaHazardType = "earthquake";
    uiHazardType = "earthquake";
  } else if (hasHeavyRain && maxWaveM >= THRESHOLDS.WAVE_MODERATE_M) {
    schemaHazardType = "coastal_flood";
    uiHazardType = "coastal_flood";
  } else if (maxWaveM >= THRESHOLDS.WAVE_HIGH_M) {
    schemaHazardType = "high_waves";
    uiHazardType = "coastal_flood";
  } else if (hasHeavyRain) {
    schemaHazardType = "extreme_rainfall";
    uiHazardType = "coastal_flood";
  } else if (maxWindMs >= THRESHOLDS.WIND_HIGH_MS) {
    schemaHazardType = "strong_wind";
    uiHazardType = "coastal_flood";
  }

  const evidenceList: IbfPromptEvidenceInput[] = [];
  const firstSlot = slots[0];

  evidenceList.push({
    evidence_id: "ev-bmkg-weather",
    source: "BMKG",
    observation: firstSlot
      ? `Prakiraan cuaca ${firstSlot.description}, suhu ${firstSlot.tempC}°C, kecepatan angin puncak ${maxWindMs} m/s dari ${firstSlot.windFrom}`
      : "Prakiraan cuaca lokal BMKG aktif",
    observed_at: conditions.sourceUpdatedAt,
  });

  if (maxWaveM > 0) {
    evidenceList.push({
      evidence_id: "ev-marine-wave",
      source: "OPEN_METEO",
      observation: `Tinggi gelombang laut maksimum ${maxWaveM} meter dengan periode ${maxWavePeriodS} detik`,
      observed_at: conditions.fetchedAt,
    });
  }

  if (activeRegionAlerts.length > 0) {
    const topAlert = activeRegionAlerts[0];
    evidenceList.push({
      evidence_id: "ev-bmkg-cap",
      source: "BMKG",
      observation: `Peringatan dini CAP aktif: ${topAlert.detail?.headline || topAlert.title}`,
      observed_at:
        topAlert.detail?.effective ?? topAlert.publishedAt ?? generatedAtIso,
    });
  }

  if (exposedFacilities.length > 0) {
    evidenceList.push({
      evidence_id: "ev-inarisk-facilities",
      source: "BNPB_INARISK",
      observation: `${exposedFacilities.length} fasilitas kritis berada pada zona kerentanan pesisir`,
      observed_at: null,
    });
  }

  evidenceList.push({
    evidence_id: "ev-internal-rule",
    source: "INTERNAL_RULE",
    observation:
      maxWaveM >= THRESHOLDS.WAVE_MODERATE_M
        ? `Ambang waspada gelombang perahu kecil (${THRESHOLDS.WAVE_MODERATE_M} m) terlampaui (puncak ${maxWaveM} m)`
        : `Tingkat dampak ${impactLevel.toUpperCase()} dihitung berdasarkan aturan ambang cuaca dan gelombang`,
    observed_at: generatedAtIso,
  });

  return {
    impactLevel,
    schemaHazardType,
    uiHazardType,
    maxWaveM,
    maxWavePeriodS,
    maxWindMs,
    hasHeavyRain,
    activeRegionAlerts,
    exposedFacilities,
    evidenceList,
  };
}

function buildDeterministicFallbackBulletin(params: {
  region: Region;
  evalResult: DeterministicEvaluation;
  validFromIso: string;
  validUntilIso: string;
  generatedAtIso: string;
}): IbfBulletin {
  const { region, evalResult, validFromIso, validUntilIso, generatedAtIso } =
    params;

  const actions: IbfAction[] = [
    {
      audience: "fishers",
      action:
        evalResult.maxWaveM >= THRESHOLDS.WAVE_MODERATE_M
          ? `Tunda pelayaran perahu kecil hingga gelombang turun di bawah ${THRESHOLDS.WAVE_MODERATE_M} meter`
          : "Periksa pembaruan cuaca dan kondisi angin sebelum melaut",
      priority:
        evalResult.maxWaveM >= THRESHOLDS.WAVE_HIGH_M ? "urgent" : "recommended",
      timeHorizon: "now",
      evidenceIds:
        evalResult.maxWaveM > 0
          ? ["ev-marine-wave", "ev-internal-rule"]
          : ["ev-bmkg-weather", "ev-internal-rule"],
    },
    {
      audience: "coastal_residents",
      action:
        evalResult.impactLevel === "high" || evalResult.impactLevel === "extreme"
          ? "Amankan dokumen penting serta barang elektronik ke tempat lebih tinggi dan pantau drainase lingkungan"
          : "Pantau informasi cuaca harian dan pastikan saluran air sekitar rumah tidak tersumbat",
      priority:
        evalResult.impactLevel === "high" || evalResult.impactLevel === "extreme"
          ? "urgent"
          : "recommended",
      timeHorizon: "within_3h",
      evidenceIds: ["ev-bmkg-weather"],
    },
    {
      audience: "village_officials",
      action:
        "Pantau titik rawan genangan pesisir dan siapkan kanal informasi warga bersama BPBD setempat",
      priority: "recommended",
      timeHorizon: "within_6h",
      evidenceIds:
        evalResult.exposedFacilities.length > 0
          ? ["ev-inarisk-facilities", "ev-internal-rule"]
          : ["ev-internal-rule"],
    },
  ];

  const evidence: EvidenceItem[] = evalResult.evidenceList.map((e) => ({
    id: e.evidence_id,
    source: e.source,
    observation: e.observation,
    observedAt: e.observed_at,
  }));

  const headline =
    evalResult.activeRegionAlerts[0]?.detail?.headline ||
    (evalResult.maxWaveM >= THRESHOLDS.WAVE_MODERATE_M
      ? `Waspada gelombang ${evalResult.maxWaveM} m dan angin ${evalResult.maxWindMs} m/s di ${region.village}`
      : `Kondisi cuaca terkendali di ${region.village}, tetap pantau pembaruan BMKG`);

  const summary =
    evalResult.maxWaveM >= THRESHOLDS.WAVE_MODERATE_M || evalResult.hasHeavyRain
      ? `Prakiraan menunjukkan potensi gelombang hingga ${evalResult.maxWaveM} meter dan kecepatan angin maksimum ${evalResult.maxWindMs} m/s di sekitar ${region.village}, ${region.city}. Nelayan perahu kecil dan warga pesisir disarankan meningkatkan kewaspadaan.`
      : `Prakiraan cuaca 24 jam ke depan untuk ${region.village}, ${region.city} berada pada tingkat dampak ${evalResult.impactLevel}. Tidak terdeteksi pelampauan ambang bahaya kritis saat ini.`;

  return {
    hazardType: evalResult.uiHazardType,
    village: region.village,
    district: region.district,
    province: region.province,
    adm4Code: region.adm4,
    impactLevel: evalResult.impactLevel,
    validFrom: validFromIso,
    validUntil: validUntilIso,
    generatedAt: generatedAtIso,
    headline: headline.slice(0, 180),
    summary,
    affectedGroups: ["fishers", "coastal_residents", "village_officials"],
    actions,
    evidence,
    uncertaintyNotes: [
      "Prakiraan BMKG diperbarui dua kali sehari dan dapat berubah sesuai dinamika atmosfer",
      "Tingkat dampak ditentukan secara deterministik oleh rule engine server",
    ],
    disclaimer:
      "Rekomendasi pendukung keputusan sistem, bukan perintah evakuasi resmi. Selalu ikuti arahan BMKG, BNPB, dan BPBD setempat",
  };
}

/**
 * Menghasilkan Buletin IBF (Impact-Based Forecasting) untuk wilayah ADM4 atau skenario simulasi.
 */
export async function handleGetIBFBulletin(options: {
  adm4?: string | null;
  mode?: string | null;
  scenarioCode?: string | null;
  useAi?: boolean;
  candidateRoutes?: RouteCandidate[];
  actorId?: string | null;
}): Promise<IbfControllerResult> {
  const modeUpper = (options.mode ?? "LIVE").toUpperCase();
  if (modeUpper === "SIMULATION" || options.scenarioCode) {
    const code = options.scenarioCode?.trim() || "ROB-URBAN-01";
    const scenario = getScenario(code);
    if (!scenario) {
      throw new ApiError(
        "NOT_FOUND",
        `Skenario simulasi ${code} tidak ditemukan`,
      );
    }

    return {
      status: "SIMULATION",
      freshness: "FRESH",
      fetchedAt: scenario.conditions.fetchedAt,
      sourceUpdatedAt: scenario.conditions.sourceUpdatedAt,
      aiGenerated: false,
      data: {
        bulletin: scenario.bulletin,
        rawContract: null,
        conditions: scenario.conditions,
        region: {
          adm4: scenario.bulletin.adm4Code,
          village: scenario.bulletin.village,
          district: scenario.bulletin.district,
          city: scenario.conditions.regionName,
          province: scenario.bulletin.province,
        },
        alerts: [],
        earthquake: scenario.earthquake,
        exposedFacilitiesCount: scenario.facilities.filter((f) => f.exposed)
          .length,
      },
    };
  }

  const targetAdm4 = (options.adm4?.trim() || envConfig.bmkgAdm4).trim();
  const useAi = options.useAi ?? true;

  const cacheKey = buildSourceCacheKey(
    "IBF_BULLETIN",
    `${targetAdm4}:ai=${useAi && hasGeminiConfig() ? "1" : "0"}`,
  );

  const cached = await withSourceCache<{
    bulletin: IbfBulletin;
    rawContract: IBFBulletin | null;
    conditions: Conditions;
    region: Region;
    alerts: WeatherAlert[];
    earthquake: Earthquake | null;
    exposedFacilitiesCount: number;
    aiGenerated: boolean;
    upstreamStatus: "LIVE" | "STALE";
  }>({
    key: cacheKey,
    provider: "IBF_ENGINE",
    ttlMs: 15 * 60 * 1000, // Cache buletin IBF 15 menit per wilayah ADM4
    loader: async (fetchedAtIso) => {
      const [weatherRes, quakeRes] = await Promise.all([
        handleGetWeatherForecast(targetAdm4),
        handleGetEarthquakes().catch(() => null),
      ]);

      const region = weatherRes.data.region;
      const alertsRes = await handleGetWeatherAlerts(region.province).catch(
        () => null,
      );

      const alerts = alertsRes?.data ?? [];
      const earthquake = quakeRes?.data.latest ?? null;
      const conditions = weatherRes.data.conditions;

      const validFromIso = conditions.slots[0]?.time ?? fetchedAtIso;
      const activeAlertExpires = alerts.find((a) => a.inRegion && a.detail?.expires)
        ?.detail?.expires;
      const defaultValidUntilIso = new Date(
        new Date(validFromIso).getTime() + 12 * 60 * 60 * 1000,
      ).toISOString();
      const validUntilIso = activeAlertExpires ?? defaultValidUntilIso;

      const evalResult = evaluateDeterministicImpact({
        conditions,
        alerts,
        earthquake,
        facilities: liveFacilities,
        generatedAtIso: fetchedAtIso,
      });

      const fallbackBulletin = buildDeterministicFallbackBulletin({
        region,
        evalResult,
        validFromIso,
        validUntilIso,
        generatedAtIso: fetchedAtIso,
      });

      if (!useAi || !hasGeminiConfig()) {
        return {
          data: {
            bulletin: fallbackBulletin,
            rawContract: null,
            conditions,
            region,
            alerts,
            earthquake,
            exposedFacilitiesCount: evalResult.exposedFacilities.length,
            aiGenerated: false,
            upstreamStatus: weatherRes.status,
          },
          sourceUpdatedAt: conditions.sourceUpdatedAt,
        };
      }

      const candidateRoutesInput: IbfPromptRouteInput[] = (
        options.candidateRoutes ?? []
      ).map((r) => ({
        candidate_route_id: r.id,
        name: r.name,
        decision: r.decision,
        rationale: r.rationale,
        affected_segments: r.affectedSegments,
      }));

      const prompt = buildIBFBulletinPrompt({
        adm4Code: region.adm4,
        villageName: region.village,
        districtName: region.district || null,
        provinceName: region.province,
        deterministicHazardType: evalResult.schemaHazardType,
        deterministicImpactLevel: evalResult.impactLevel,
        validFromIso,
        validUntilIso,
        generatedAtIso: fetchedAtIso,
        evidenceList: evalResult.evidenceList,
        candidateRoutes: candidateRoutesInput,
        exposedFacilitiesCount: evalResult.exposedFacilities.length,
      });

      try {
        const aiRes = await generateStructuredWithMeta({
          featureKey: AI_FEATURE_KEYS.IBF_BULLETIN,
          schema: IBFBulletinSchema,
          prompt,
          systemInstruction: IBF_SYSTEM_INSTRUCTION,
        });

        const guarded = applyIBFBulletinGuard(aiRes.data, {
          expectedAdm4Code: region.adm4,
          deterministicImpactLevel: evalResult.impactLevel,
          allowedEvidenceIds: new Set(
            evalResult.evidenceList.map((e) => e.evidence_id),
          ),
          allowedCandidateRouteIds: new Set(
            candidateRoutesInput.map((r) => r.candidate_route_id),
          ),
        });

        void recordAiAnalysisRun({
          featureKey: AI_FEATURE_KEYS.IBF_BULLETIN,
          actorId: options.actorId ?? null,
          modelId: aiRes.meta.modelId,
          promptVersion: aiRes.meta.promptVersion,
          schemaVersion: aiRes.meta.schemaVersion,
          inputHash: aiRes.meta.inputHash,
          status: "succeeded",
          latencyMs: aiRes.meta.latencyMs,
        });

        return {
          data: {
            bulletin: mapIBFBulletinToUi(guarded),
            rawContract: guarded,
            conditions,
            region,
            alerts,
            earthquake,
            exposedFacilitiesCount: evalResult.exposedFacilities.length,
            aiGenerated: true,
            upstreamStatus: weatherRes.status,
          },
          sourceUpdatedAt: conditions.sourceUpdatedAt,
        };
      } catch (aiError) {
        // Jika AI timeout atau ditolak guard, catat kegagalan dan kembalikan buletin deterministik resmi (PRD Bab 4.1.5)
        void recordAiAnalysisRun({
          featureKey: AI_FEATURE_KEYS.IBF_BULLETIN,
          actorId: options.actorId ?? null,
          modelId: envConfig.gemini.model,
          promptVersion: "ibf-bulletin-v1.0",
          schemaVersion: "1.0.0",
          inputHash: targetAdm4,
          status:
            aiError instanceof ApiError && aiError.code === "INVALID_SCHEMA"
              ? "rejected_by_guard"
              : "failed",
          errorCode:
            aiError instanceof ApiError ? aiError.code : "AI_SYNTHESIS_ERROR",
        });

        return {
          data: {
            bulletin: fallbackBulletin,
            rawContract: null,
            conditions,
            region,
            alerts,
            earthquake,
            exposedFacilitiesCount: evalResult.exposedFacilities.length,
            aiGenerated: false,
            upstreamStatus: weatherRes.status,
          },
          sourceUpdatedAt: conditions.sourceUpdatedAt,
        };
      }
    },
  }).catch(() => {
    // Fallback terakhir bila seluruh jaringan gagal
    return {
      status: "STALE" as const,
      freshness: "STALE" as FreshnessStatus,
      provider: "IBF_ENGINE",
      fetchedAt: liveBulletin.generatedAt,
      sourceUpdatedAt: liveBulletin.generatedAt,
      expiresAt: liveBulletin.validUntil,
      checksum: "fallback",
      data: {
        bulletin: liveBulletin,
        rawContract: null,
        conditions: {
          regionName: `${liveBulletin.village}, ${liveBulletin.province}`,
          fetchedAt: liveBulletin.generatedAt,
          sourceUpdatedAt: liveBulletin.generatedAt,
          slots: [],
        },
        region: {
          adm4: liveBulletin.adm4Code,
          village: liveBulletin.village,
          district: liveBulletin.district,
          city: "Kota Bengkulu",
          province: liveBulletin.province,
        },
        alerts: [],
        earthquake: null,
        exposedFacilitiesCount: liveFacilities.filter((f) => f.exposed).length,
        aiGenerated: false,
        upstreamStatus: "STALE" as const,
      },
    };
  });

  const finalStatus: "LIVE" | "STALE" =
    cached.status === "STALE" || cached.data.upstreamStatus === "STALE"
      ? "STALE"
      : "LIVE";
  const finalFreshness: FreshnessStatus =
    finalStatus === "STALE" ? "STALE" : "FRESH";

  return {
    status: finalStatus,
    freshness: finalFreshness,
    fetchedAt: cached.fetchedAt,
    sourceUpdatedAt: cached.sourceUpdatedAt,
    aiGenerated: cached.data.aiGenerated,
    data: {
      bulletin: cached.data.bulletin,
      rawContract: cached.data.rawContract,
      conditions: cached.data.conditions,
      region: cached.data.region,
      alerts: cached.data.alerts,
      earthquake: cached.data.earthquake,
      exposedFacilitiesCount: cached.data.exposedFacilitiesCount,
    },
  };
}