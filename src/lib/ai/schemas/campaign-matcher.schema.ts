// src/lib/ai/schemas/campaign-matcher.schema.ts
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";

export const CampaignMatcherSchema = z
  .object({
    matching_status: z.enum([
      "matched",
      "no_relevant_campaign",
      "insufficient_context",
    ]),
    disaster_context: z
      .object({
        hazard_type: z.enum([
          "flood",
          "coastal_flood",
          "wildfire",
          "mangrove_restoration",
          "earthquake",
          "other",
        ]),
        affected_area: z.string().min(2).max(160),
        severity: z.enum(["low", "moderate", "high", "extreme"]),
        affected_people_estimate: z
          .number()
          .int()
          .min(0)
          .max(100000000)
          .nullable(),
      })
      .strict(),
    campaign_matches: z
      .array(
        z
          .object({
            campaign_id: z.string().uuid(),
            relevance_score: z.number().min(0).max(100),
            matching_reasons: z.array(z.string().min(4).max(220)).min(1).max(6),
            mismatch_or_gap: z.array(z.string().max(220)).max(6),
            recommended_display: z.boolean(),
          })
          .strict(),
      )
      .max(10),
    logistics_estimate: z
      .array(
        z
          .object({
            item_code: z.string().min(1).max(60),
            item_name: z.string().min(2).max(120),
            quantity: z.number().min(0).max(100000000),
            unit: z.enum([
              "paket",
              "unit",
              "buah",
              "lembar",
              "bibit",
              "set",
              "hari",
            ]),
            unit_cost_idr: z.number().min(0).max(1000000000).nullable(),
            subtotal_idr: z.number().min(0).max(1000000000000).nullable(),
            cost_source: z.string().max(240).nullable(),
            assumption: z.string().min(5).max(300),
          })
          .strict(),
      )
      .max(20),
    total_estimated_cost_idr: z.number().min(0).max(1000000000000).nullable(),
    fundraising_draft: z
      .object({
        title: z.string().min(8).max(120),
        body: z.string().min(80).max(2500),
        intended_beneficiaries: z.string().min(3).max(300),
        transparency_notes: z.array(z.string().max(240)).max(8),
        status_label: z.literal("DRAF — BELUM DISETUJUI"),
      })
      .strict(),
    assumptions: z.array(z.string().min(5).max(300)).max(12),
    warnings: z.array(z.string().max(300)).max(12),
    human_approval_required: z.boolean(),
  })
  .strict();

export type CampaignMatcher = z.infer<typeof CampaignMatcherSchema>;

export interface AllowedCampaignCandidate {
  id: string;
  url: string;
  status: "active" | "ended" | "unverified" | "hidden";
  verification: "verified" | "needs_recheck" | "invalid";
}

export interface DeterministicCatalogPrice {
  item_code: string;
  unit_cost_idr: number | null;
  cost_source: string | null;
}

/**
 * Memvalidasi apakah URL kampanye merupakan HTTPS valid pada domain resmi kitabisa.com.
 */
export function isAllowedKitabisaUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "kitabisa.com" || host.endsWith(".kitabisa.com");
  } catch {
    return false;
  }
}

/**
 * Menerapkan aturan keselamatan domain pasca-validasi untuk Campaign Matcher (PRD Bab 5.5):
 * 1. Memastikan setiap campaign_id berada pada closed candidate set yang aktif, verified, dan lolos allowlist kitabisa.com.
 * 2. Menghitung ulang subtotal_idr = quantity * unit_cost_idr dan total_estimated_cost_idr secara deterministik.
 * 3. Memaksa human_approval_required = true dan status_label = "DRAF — BELUM DISETUJUI".
 */
export function applyCampaignMatcherGuard(
  result: CampaignMatcher,
  allowedCandidates: AllowedCampaignCandidate[],
  priceCatalog?: Map<string, DeterministicCatalogPrice>,
): CampaignMatcher {
  const validCandidateMap = new Map<string, AllowedCampaignCandidate>();
  for (const c of allowedCandidates) {
    if (
      c.status === "active" &&
      c.verification === "verified" &&
      isAllowedKitabisaUrl(c.url)
    ) {
      validCandidateMap.set(c.id, c);
    }
  }

  for (const match of result.campaign_matches) {
    if (!validCandidateMap.has(match.campaign_id)) {
      throw new ApiError(
        "INVALID_SCHEMA",
        `Campaign ID dari AI tidak ditemukan pada katalog kandidat aktif/terverifikasi: ${match.campaign_id}`,
      );
    }
  }

  let hasUnknownCost = false;
  let runningTotal = 0;

  const recalculatedLogistics = result.logistics_estimate.map((item) => {
    const catalogEntry = priceCatalog?.get(item.item_code);
    const unitCost =
      catalogEntry !== undefined ? catalogEntry.unit_cost_idr : item.unit_cost_idr;
    const costSource =
      catalogEntry !== undefined ? catalogEntry.cost_source : item.cost_source;
    const quantity = Math.max(0, Math.floor(item.quantity));

    if (unitCost === null) {
      hasUnknownCost = true;
      return {
        ...item,
        quantity,
        unit_cost_idr: null,
        subtotal_idr: null,
        cost_source: costSource,
      };
    }

    const subtotal = quantity * unitCost;
    runningTotal += subtotal;

    return {
      ...item,
      quantity,
      unit_cost_idr: unitCost,
      subtotal_idr: subtotal,
      cost_source: costSource,
    };
  });

  return {
    ...result,
    logistics_estimate: recalculatedLogistics,
    total_estimated_cost_idr:
      recalculatedLogistics.length === 0 || hasUnknownCost ? null : runningTotal,
    fundraising_draft: {
      ...result.fundraising_draft,
      status_label: "DRAF — BELUM DISETUJUI",
    },
    human_approval_required: true,
  };
}