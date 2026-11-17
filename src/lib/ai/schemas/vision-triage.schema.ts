// src/lib/ai/schemas/vision-triage.schema.ts
import { z } from "zod";
import type { VisionResult } from "@/lib/types";

const ConfidenceSchema = z.enum(["low", "medium", "high"]);

export const VisionTriageSchema = z
  .object({
    report_type: z.enum(["flood_report", "mangrove_audit", "unclassified"]),
    classification: z.enum([
      "flooding",
      "fast_water_flow",
      "road_damage",
      "road_inaccessible",
      "mangrove_vegetation",
      "shoreline_erosion_signs",
      "other",
      "unclassifiable",
    ]),
    visual_observations: z.array(z.string().max(240)).max(12),
    hazards: z
      .object({
        visible_fast_flow: z.boolean(),
        visible_road_damage: z.boolean(),
        visible_inundation: z.boolean(),
        person_potentially_needing_assistance_visible: z.boolean(),
        debris_or_obstruction_visible: z.boolean(),
      })
      .strict(),
    flood_assessment: z
      .object({
        estimated_water_depth_cm: z.number().min(0).max(1000).nullable(),
        depth_estimation_basis: z.enum([
          "visible_scale_reference",
          "user_provided_reference",
          "no_reliable_reference",
          "not_applicable",
        ]),
        depth_confidence: ConfidenceSchema.nullable(),
      })
      .strict(),
    mangrove_assessment: z
      .object({
        vegetation_condition: z.enum([
          "healthy_appearing",
          "needs_attention",
          "severely_damaged_appearing",
          "not_assessable",
          "not_applicable",
        ]),
        estimated_visible_seedlings: z
          .number()
          .int()
          .min(0)
          .max(10000)
          .nullable(),
        visible_stress_signs: z
          .array(
            z.enum([
              "yellowing_leaves",
              "dry_leaves",
              "broken_stem",
              "exposed_roots",
              "sediment_burial",
              "debris_impact",
              "none_obvious",
              "unclear",
            ]),
          )
          .max(8),
        shoreline_erosion_visual_risk: z.enum([
          "low",
          "moderate",
          "high",
          "unknown",
          "not_applicable",
        ]),
      })
      .strict(),
    image_quality: z
      .object({
        blur: z.enum(["low", "moderate", "high"]),
        visibility: z.enum(["clear", "partially_obstructed", "poor"]),
        sufficient_for_assessment: z.boolean(),
      })
      .strict(),
    visual_integrity_assessment: z.enum([
      "no_obvious_visual_inconsistency",
      "suspicious_visual_artifacts",
      "inconclusive",
    ]),
    urgency: z.enum(["low", "moderate", "high", "critical"]),
    recommended_next_action: z.string().min(5).max(500),
    confidence: ConfidenceSchema,
    limitations: z.array(z.string().max(240)).max(10),
    review_required: z.boolean(),
  })
  .strict();

export type VisionTriage = z.infer<typeof VisionTriageSchema>;

/**
 * Menerapkan aturan keselamatan domain pasca-validasi sesuai PRD Bab 5.3:
 * 1. Jika depth_estimation_basis === "no_reliable_reference" atau "not_applicable",
 *    paksa estimated_water_depth_cm = null dan sesuaikan depth_confidence.
 * 2. Jika report_type === "mangrove_audit", netralkan flood_assessment.
 * 3. Jika image_quality.sufficient_for_assessment === false, paksa review_required = true.
 * 4. Jika ada indikasi orang terjebak atau arus deras, pastikan review_required = true.
 */
export function applyVisionTriageGuard(raw: VisionTriage): VisionTriage {
  const floodAssessment = { ...raw.flood_assessment };

  if (
    floodAssessment.depth_estimation_basis === "no_reliable_reference" ||
    floodAssessment.depth_estimation_basis === "not_applicable"
  ) {
    floodAssessment.estimated_water_depth_cm = null;
    if (
      floodAssessment.depth_confidence !== null &&
      floodAssessment.depth_confidence !== "low"
    ) {
      floodAssessment.depth_confidence = "low";
    }
  }

  if (raw.report_type === "mangrove_audit") {
    floodAssessment.estimated_water_depth_cm = null;
    floodAssessment.depth_estimation_basis = "not_applicable";
    floodAssessment.depth_confidence = null;
  }

  const forceReview =
    !raw.image_quality.sufficient_for_assessment ||
    raw.hazards.person_potentially_needing_assistance_visible ||
    raw.hazards.visible_fast_flow ||
    raw.visual_integrity_assessment === "suspicious_visual_artifacts";

  return {
    ...raw,
    flood_assessment: floodAssessment,
    review_required: raw.review_required || forceReview,
  };
}

/**
 * Mengonversi VisionTriage (kontrak schema PRD / database) ke VisionResult (kontrak UI di src/lib/types.ts).
 */
export function mapVisionTriageToVisionResult(
  triage: VisionTriage,
): VisionResult {
  const safe = applyVisionTriageGuard(triage);
  const hazardLabels: string[] = [];

  if (safe.hazards.visible_inundation) {
    hazardLabels.push("Genangan terlihat");
  }
  if (safe.hazards.visible_fast_flow) {
    hazardLabels.push("Arus deras terlihat");
  }
  if (safe.hazards.visible_road_damage) {
    hazardLabels.push("Kerusakan jalan terlihat");
  }
  if (safe.hazards.debris_or_obstruction_visible) {
    hazardLabels.push("Puing menghalangi akses");
  }
  if (safe.hazards.person_potentially_needing_assistance_visible) {
    hazardLabels.push("Indikasi warga membutuhkan bantuan (perlu verifikasi segera)");
  }

  return {
    classification: safe.classification,
    urgency: safe.urgency,
    confidence: safe.confidence,
    waterDepthCm: safe.flood_assessment.estimated_water_depth_cm,
    depthBasis: safe.flood_assessment.depth_estimation_basis,
    observations: safe.visual_observations,
    hazards: hazardLabels,
    limitations: safe.limitations,
    integrity: safe.visual_integrity_assessment,
    nextAction: safe.recommended_next_action,
    reviewRequired: safe.review_required,
  };
}