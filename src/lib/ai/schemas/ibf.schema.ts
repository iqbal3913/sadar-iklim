// src/lib/ai/schemas/ibf.schema.ts
import { z } from "zod";
import type { HazardType, IbfBulletin, ImpactLevel } from "@/lib/types";
import { ApiError } from "@/lib/api/errors";

export const IBFBulletinSchema = z
  .object({
    hazard_type: z.enum([
      "coastal_flood",
      "extreme_rainfall",
      "high_waves",
      "strong_wind",
      "earthquake",
      "tsunami_related_alert",
      "wildfire_smoke",
      "multi_hazard",
      "unknown",
    ]),
    location: z
      .object({
        adm4_code: z.string().min(1).max(20),
        village_name: z.string().min(1).max(120),
        district_name: z.string().max(120).nullable(),
        province_name: z.string().min(1).max(120),
      })
      .strict(),
    impact_level: z.enum(["low", "moderate", "high", "extreme"]),
    valid_from: z.string().datetime({ offset: true }),
    valid_until: z.string().datetime({ offset: true }),
    generated_at: z.string().datetime({ offset: true }),
    headline: z.string().min(8).max(180),
    plain_language_summary: z.string().min(20).max(900),
    affected_groups: z
      .array(
        z.enum([
          "fishers",
          "coastal_residents",
          "children",
          "older_people",
          "people_with_disabilities",
          "public_facility_operators",
          "village_officials",
          "forest_communities",
          "general_public",
        ]),
      )
      .min(1)
      .max(9),
    actions: z
      .array(
        z
          .object({
            audience: z.enum([
              "fishers",
              "coastal_residents",
              "village_officials",
              "facility_operators",
              "general_public",
            ]),
            action: z.string().min(5).max(300),
            priority: z.enum(["recommended", "urgent", "critical"]),
            time_horizon: z.enum([
              "now",
              "within_3h",
              "within_6h",
              "within_24h",
            ]),
            evidence_ids: z.array(z.string().min(1).max(100)).max(10),
          })
          .strict(),
      )
      .min(1)
      .max(15),
    route_recommendations: z
      .array(
        z
          .object({
            candidate_route_id: z.string().min(1).max(100),
            decision: z.enum(["recommended", "caution", "not_recommended"]),
            rationale: z.string().min(5).max(350),
            requires_officer_approval: z.boolean(),
          })
          .strict(),
      )
      .max(5),
    route_cautions: z.array(z.string().max(240)).max(10),
    evidence: z
      .array(
        z
          .object({
            evidence_id: z.string().min(1).max(100),
            source: z.enum([
              "BMKG",
              "OPEN_METEO",
              "BNPB_INARISK",
              "NASA_FIRMS",
              "CITIZEN_REPORT",
              "INTERNAL_RULE",
            ]),
            observation: z.string().min(3).max(300),
            observed_at: z.string().datetime({ offset: true }).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    uncertainty_notes: z.array(z.string().max(240)).max(10),
    official_instruction_required: z.boolean(),
    disclaimer: z.string().min(10).max(400),
  })
  .strict();

export type IBFBulletin = z.infer<typeof IBFBulletinSchema>;

export interface IBFGuardContext {
  expectedAdm4Code: string;
  deterministicImpactLevel: ImpactLevel;
  allowedEvidenceIds: Set<string>;
  allowedCandidateRouteIds: Set<string>;
}

/**
 * Menerapkan aturan keselamatan domain pasca-validasi untuk Buletin IBF (PRD Bab 5.4):
 * - Memastikan adm4_code sesuai wilayah yang diminta server.
 * - Menolak evidence_id atau candidate_route_id yang dikarang model di luar daftar input server.
 * - Memaksa impact_level mengikuti hasil rule engine deterministik.
 * - Memaksa requires_officer_approval = true untuk seluruh rekomendasi rute publik.
 */
export function applyIBFBulletinGuard(
  bulletin: IBFBulletin,
  ctx: IBFGuardContext,
): IBFBulletin {
  for (const ev of bulletin.evidence) {
    if (!ctx.allowedEvidenceIds.has(ev.evidence_id)) {
      throw new ApiError(
        "INVALID_SCHEMA",
        `Evidence ID tidak dikenal dari model AI: ${ev.evidence_id}`,
      );
    }
  }

  for (const act of bulletin.actions) {
    for (const evId of act.evidence_ids) {
      if (!ctx.allowedEvidenceIds.has(evId)) {
        throw new ApiError(
          "INVALID_SCHEMA",
          `Action mereferensikan evidence_id yang tidak valid: ${evId}`,
        );
      }
    }
  }

  for (const routeRec of bulletin.route_recommendations) {
    if (!ctx.allowedCandidateRouteIds.has(routeRec.candidate_route_id)) {
      throw new ApiError(
        "INVALID_SCHEMA",
        `Rekomendasi rute mereferensikan candidate_route_id yang tidak dikenal: ${routeRec.candidate_route_id}`,
      );
    }
  }

  return {
    ...bulletin,
    location: {
      ...bulletin.location,
      adm4_code: ctx.expectedAdm4Code,
    },
    impact_level: ctx.deterministicImpactLevel,
    official_instruction_required: true,
    route_recommendations: bulletin.route_recommendations.map((r) => ({
      ...r,
      requires_officer_approval: true,
    })),
  };
}

function mapSchemaHazardToUiHazard(
  hazard: IBFBulletin["hazard_type"],
): HazardType {
  switch (hazard) {
    case "coastal_flood":
    case "extreme_rainfall":
    case "high_waves":
    case "strong_wind":
      return "coastal_flood";
    case "wildfire_smoke":
      return "wildfire";
    case "earthquake":
    case "tsunami_related_alert":
      return "earthquake";
    case "multi_hazard":
    case "unknown":
      return "multi_hazard";
  }
}

/**
 * Mengonversi IBFBulletin (kontrak schema PRD) menjadi IbfBulletin (kontrak UI di src/lib/types.ts).
 */
export function mapIBFBulletinToUi(bulletin: IBFBulletin): IbfBulletin {
  return {
    hazardType: mapSchemaHazardToUiHazard(bulletin.hazard_type),
    village: bulletin.location.village_name,
    district: bulletin.location.district_name ?? "",
    province: bulletin.location.province_name,
    adm4Code: bulletin.location.adm4_code,
    impactLevel: bulletin.impact_level,
    validFrom: bulletin.valid_from,
    validUntil: bulletin.valid_until,
    generatedAt: bulletin.generated_at,
    headline: bulletin.headline,
    summary: bulletin.plain_language_summary,
    affectedGroups: bulletin.affected_groups,
    actions: bulletin.actions.map((a) => ({
      audience: a.audience,
      action: a.action,
      priority: a.priority,
      timeHorizon: a.time_horizon,
      evidenceIds: a.evidence_ids,
    })),
    evidence: bulletin.evidence.map((e) => ({
      id: e.evidence_id,
      source: e.source,
      observation: e.observation,
      observedAt: e.observed_at,
    })),
    uncertaintyNotes: bulletin.uncertainty_notes,
    disclaimer: bulletin.disclaimer,
  };
}