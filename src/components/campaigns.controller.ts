// src/controllers/campaigns.controller.ts
import "server-only";
import { z } from "zod";
import {
  AI_FEATURE_KEYS,
  type AllowedCampaignCandidate,
  CAMPAIGN_MATCHER_SYSTEM_INSTRUCTION,
  type CampaignCandidatePromptItem,
  type CampaignMatcher,
  CampaignMatcherSchema,
  type DeterministicCatalogPrice,
  type DeterministicLogisticsPromptItem,
  applyCampaignMatcherGuard,
  buildCampaignMatcherPrompt,
  generateStructuredWithMeta,
  isAllowedKitabisaUrl,
} from "@/lib/ai";
import { ApiError } from "@/lib/api";
import { envConfig, hasGeminiConfig } from "@/lib/env-config";
import { hazardLabel } from "@/lib/format";
import { campaigns as mockCampaigns } from "@/lib/mock/campaigns";
import { recordAiAnalysisRun } from "@/lib/supabase/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Campaign, ImpactLevel } from "@/lib/types";

const MatchCampaignRequestSchema = z.object({
  hazardType: z
    .enum([
      "flood",
      "coastal_flood",
      "wildfire",
      "mangrove_restoration",
      "earthquake",
      "other",
    ])
    .default("coastal_flood"),
  affectedArea: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .default("Pasar Baru, Kota Bengkulu"),
  severity: z.enum(["low", "moderate", "high", "extreme"]).default("high"),
  affectedPeopleEstimate: z.coerce
    .number()
    .int()
    .min(0)
    .max(100000000)
    .nullable()
    .default(150),
  durationDays: z.coerce.number().int().min(1).max(365).default(3),
  useAi: z.boolean().default(true),
});

export type MatchCampaignRequestInput = z.input<
  typeof MatchCampaignRequestSchema
>;

interface CatalogPriceRow {
  itemCode: string;
  itemName: string;
  unit: "paket" | "unit" | "buah" | "lembar" | "bibit" | "set" | "hari";
  basis: "per_person_day" | "per_person" | "fixed";
  unitCostIdr: number | null;
  costSource: string | null;
}

const DEFAULT_PRICE_CATALOG: CatalogPriceRow[] = [
  {
    itemCode: "FOOD",
    itemName: "Paket pangan",
    unit: "paket",
    basis: "per_person_day",
    unitCostIdr: 35000,
    costSource: "Katalog harga contoh referensi darurat",
  },
  {
    itemCode: "WATER",
    itemName: "Air bersih",
    unit: "paket",
    basis: "per_person_day",
    unitCostIdr: 15000,
    costSource: "Katalog harga contoh referensi darurat",
  },
  {
    itemCode: "BLANKET",
    itemName: "Selimut",
    unit: "lembar",
    basis: "per_person",
    unitCostIdr: 45000,
    costSource: "Katalog harga contoh referensi darurat",
  },
  {
    itemCode: "BOAT",
    itemName: "Perahu karet",
    unit: "unit",
    basis: "fixed",
    unitCostIdr: null,
    costSource: "Harga belum tersedia (cost_unknown)",
  },
];

/**
 * Pemetaan ID mock kampanye ("c1".."c4") ke UUID v4 deterministik agar patuh terhadap
 * kontrak `campaign_id: z.string().uuid()` pada `CampaignMatcherSchema` (PRD Bab 5.5).
 */
const MOCK_UUID_MAP: Record<string, string> = {
  c1: "11111111-1111-4111-8111-111111111101",
  c2: "11111111-1111-4111-8111-111111111102",
  c3: "11111111-1111-4111-8111-111111111103",
  c4: "11111111-1111-4111-8111-111111111104",
};

function ensureValidUuid(rawId: string, index: number): string {
  if (MOCK_UUID_MAP[rawId]) return MOCK_UUID_MAP[rawId];
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rawId,
    )
  ) {
    return rawId;
  }
  const suffix = String(index + 1).padStart(12, "0");
  return `11111111-1111-4111-8111-${suffix}`;
}

/**
 * Mengambil daftar kampanye Kitabisa yang aktif, terverifikasi, dan lolos allowlist domain `kitabisa.com`.
 */
export async function handleListVerifiedCampaigns(): Promise<Campaign[]> {
  const fallbackWithUuid: Campaign[] = mockCampaigns.map((c, idx) => ({
    ...c,
    id: ensureValidUuid(c.id, idx),
  }));

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return fallbackWithUuid.filter(
      (c) =>
        c.status === "active" &&
        c.verification === "verified" &&
        isAllowedKitabisaUrl(c.url),
    );
  }

  try {
    const { data, error } = await admin
      .from("kitabisa_campaigns")
      .select("*")
      .eq("status", "active")
      .eq("verification_status", "verified")
      .order("verified_at", { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) {
      return fallbackWithUuid.filter(
        (c) =>
          c.status === "active" &&
          c.verification === "verified" &&
          isAllowedKitabisaUrl(c.url),
      );
    }

    const mapped: Campaign[] = data
      .map((row, idx) => {
        const r = row as Record<string, unknown>;
        const rawCat = String(r.category ?? "humanitarian");
        const category: Campaign["category"] =
          rawCat === "flood" ||
          rawCat === "wildfire" ||
          rawCat === "mangrove" ||
          rawCat === "earthquake" ||
          rawCat === "humanitarian" ||
          rawCat === "other"
            ? rawCat
            : "humanitarian";

        return {
          id: ensureValidUuid(String(r.id), idx),
          title: String(r.title ?? ""),
          url: String(r.campaign_url ?? ""),
          category,
          summary: String(r.summary ?? ""),
          area: String(r.beneficiary_area ?? ""),
          status: "active" as const,
          verification: "verified" as const,
          verifiedAt: r.verified_at ? String(r.verified_at) : null,
        };
      })
      .filter((c) => isAllowedKitabisaUrl(c.url));

    return mapped.length > 0
      ? mapped
      : fallbackWithUuid.filter(
          (c) =>
            c.status === "active" &&
            c.verification === "verified" &&
            isAllowedKitabisaUrl(c.url),
        );
  } catch {
    return fallbackWithUuid.filter(
      (c) =>
        c.status === "active" &&
        c.verification === "verified" &&
        isAllowedKitabisaUrl(c.url),
    );
  }
}

async function loadActivePriceCatalog(): Promise<CatalogPriceRow[]> {
  const admin = getSupabaseAdminClient();
  if (!admin) return DEFAULT_PRICE_CATALOG;

  try {
    const { data, error } = await admin
      .from("logistics_price_catalog")
      .select("*")
      .eq("is_active", true);

    if (error || !data || data.length === 0) {
      return DEFAULT_PRICE_CATALOG;
    }

    return data.map((row) => {
      const r = row as Record<string, unknown>;
      const rawUnit = String(r.unit ?? "paket");
      const unit: CatalogPriceRow["unit"] =
        rawUnit === "paket" ||
        rawUnit === "unit" ||
        rawUnit === "buah" ||
        rawUnit === "lembar" ||
        rawUnit === "bibit" ||
        rawUnit === "set" ||
        rawUnit === "hari"
          ? rawUnit
          : "paket";

      const rawBasis = String(r.basis ?? "per_person");
      const basis: CatalogPriceRow["basis"] =
        rawBasis === "per_person_day" ||
        rawBasis === "per_person" ||
        rawBasis === "fixed"
          ? rawBasis
          : "per_person";

      const rawCost = r.unit_cost_idr;
      const unitCostIdr =
        rawCost === null || rawCost === undefined
          ? null
          : Number.isFinite(Number(rawCost))
            ? Number(rawCost)
            : null;

      return {
        itemCode: String(r.item_code ?? "ITEM"),
        itemName: String(r.item_name ?? "Kebutuhan dasar"),
        unit,
        basis,
        unitCostIdr,
        costSource: r.cost_source ? String(r.cost_source) : null,
      };
    });
  } catch {
    return DEFAULT_PRICE_CATALOG;
  }
}

/**
 * Menghitung kebutuhan logistik secara deterministik berdasarkan jumlah warga terdampak dan durasi hari
 * sesuai aturan `docs/kampanye.md` dan PRD Bab 4.4.5.
 */
export function computeDeterministicLogistics(params: {
  catalog: CatalogPriceRow[];
  peopleCount: number;
  durationDays: number;
}): {
  items: DeterministicLogisticsPromptItem[];
  totalEstimatedCostIdr: number | null;
  priceMap: Map<string, DeterministicCatalogPrice>;
} {
  const safePeople = Math.max(0, Math.floor(params.peopleCount));
  const safeDays = Math.max(1, Math.floor(params.durationDays));

  let hasUnknownCost = false;
  let runningTotal = 0;
  const priceMap = new Map<string, DeterministicCatalogPrice>();

  const items: DeterministicLogisticsPromptItem[] = params.catalog.map((c) => {
    priceMap.set(c.itemCode, {
      item_code: c.itemCode,
      unit_cost_idr: c.unitCostIdr,
      cost_source: c.costSource,
    });

    const quantity =
      c.basis === "per_person_day"
        ? safePeople * safeDays
        : c.basis === "per_person"
          ? safePeople
          : 1;

    const assumption =
      c.basis === "per_person_day"
        ? `1 ${c.unit} per orang per hari (${safePeople} jiwa x ${safeDays} hari)`
        : c.basis === "per_person"
          ? `1 ${c.unit} per orang (${safePeople} jiwa)`
          : `Kebutuhan tetap operasional lapangan (${quantity} ${c.unit})`;

    if (c.unitCostIdr === null) {
      hasUnknownCost = true;
      return {
        item_code: c.itemCode,
        item_name: c.itemName,
        quantity,
        unit: c.unit,
        unit_cost_idr: null,
        subtotal_idr: null,
        cost_source: c.costSource,
        assumption,
      };
    }

    const subtotal = quantity * c.unitCostIdr;
    runningTotal += subtotal;

    return {
      item_code: c.itemCode,
      item_name: c.itemName,
      quantity,
      unit: c.unit,
      unit_cost_idr: c.unitCostIdr,
      subtotal_idr: subtotal,
      cost_source: c.costSource,
      assumption,
    };
  });

  return {
    items,
    totalEstimatedCostIdr:
      items.length === 0 || hasUnknownCost ? null : runningTotal,
    priceMap,
  };
}

function buildDeterministicCampaignMatcherResult(params: {
  hazardType: MatchCampaignRequestInput["hazardType"] & string;
  affectedArea: string;
  severity: ImpactLevel;
  affectedPeopleEstimate: number | null;
  durationDays: number;
  verifiedCampaigns: Campaign[];
  logistics: DeterministicLogisticsPromptItem[];
  totalEstimatedCostIdr: number | null;
}): CampaignMatcher {
  const {
    hazardType,
    affectedArea,
    severity,
    affectedPeopleEstimate,
    durationDays,
    verifiedCampaigns,
    logistics,
    totalEstimatedCostIdr,
  } = params;

  const targetCategory: Campaign["category"] =
    hazardType === "wildfire"
      ? "wildfire"
      : hazardType === "earthquake"
        ? "earthquake"
        : hazardType === "mangrove_restoration"
          ? "mangrove"
          : "flood";

  const matches: CampaignMatcher["campaign_matches"] = verifiedCampaigns
    .map((c) => {
      const score =
        c.category === targetCategory
          ? 92
          : c.category === "humanitarian"
            ? 65
            : 25;
      return {
        campaign_id: c.id,
        relevance_score: score,
        matching_reasons: [
          `Kategori kampanye (${c.category}) relevan dengan konteks ${targetCategory}`,
          `Kampanye telah diverifikasi aktif untuk wilayah ${c.area}`,
        ],
        mismatch_or_gap:
          c.area.toLowerCase().includes(affectedArea.toLowerCase())
            ? []
            : [`Cakupan wilayah kampanye (${c.area}) lebih luas dari lokasi spesifik (${affectedArea})`],
        recommended_display: score >= 50,
      };
    })
    .filter((m) => m.recommended_display)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  const peopleCount = affectedPeopleEstimate ?? 150;
  const uiHazardKey =
    hazardType === "wildfire"
      ? "wildfire"
      : hazardType === "earthquake"
        ? "earthquake"
        : "coastal_flood";

  const draftBody = [
    `Bantuan darurat awal untuk respons ${hazardLabel[uiHazardKey].toLowerCase()} di ${affectedArea}.`,
    `Berdasarkan estimasi awal untuk sekitar ${peopleCount} warga terdampak selama ${durationDays} hari masa tanggap darurat, dibutuhkan dukungan logistik dasar berupa paket pangan, air bersih, dan perlengkapan perlindungan.`,
    `Rincian kebutuhan dihitung secara transparan dari katalog harga acuan dan masih memerlukan verifikasi serta persetujuan resmi dari BPBD atau komunitas setempat sebelum dipublikasikan.`,
  ].join(" ");

  return {
    matching_status: matches.length > 0 ? "matched" : "no_relevant_campaign",
    disaster_context: {
      hazard_type:
        hazardType === "flood" ||
        hazardType === "coastal_flood" ||
        hazardType === "wildfire" ||
        hazardType === "mangrove_restoration" ||
        hazardType === "earthquake"
          ? hazardType
          : "other",
      affected_area: affectedArea,
      severity,
      affected_people_estimate: affectedPeopleEstimate,
    },
    campaign_matches: matches,
    logistics_estimate: logistics,
    total_estimated_cost_idr: totalEstimatedCostIdr,
    fundraising_draft: {
      title: `DRAF Bantuan Darurat ${hazardLabel[uiHazardKey]} — ${affectedArea}`.slice(
        0,
        120,
      ),
      body: draftBody,
      intended_beneficiaries: `Sekitar ${peopleCount} warga terdampak di ${affectedArea} (estimasi awal, belum terverifikasi final)`,
      transparency_notes: [
        "SadarIklim tidak menampung atau memproses dana donasi secara langsung",
        "Item dengan harga belum tersedia (cost_unknown) tidak dimasukkan ke dalam total biaya",
        "Tautan kampanye mengarah ke domain resmi kitabisa.com dan bukan bentuk kemitraan resmi",
      ],
      status_label: "DRAF — BELUM DISETUJUI",
    },
    assumptions: [
      `Estimasi warga terdampak: ${peopleCount} jiwa selama ${durationDays} hari`,
      "Kebutuhan pangan dan air bersih dihitung per orang per hari",
    ],
    warnings: [
      "Terdapat komponen logistik dengan harga belum tersedia (cost_unknown) sehingga total biaya hanya mencakup item yang diketahui harganya",
      "Draf narasi wajib ditinjau dan disetujui manusia sebelum digunakan",
    ],
    human_approval_required: true,
  };
}

/**
 * Mencocokkan bencana dengan katalog kampanye Kitabisa terverifikasi dan menghasilkan
 * estimasi logistik + draf narasi penggalangan dana sesuai `CampaignMatcherSchema` (PRD Bab 4.4 & 5.5).
 */
export async function handleMatchCampaignsAndLogistics(
  rawInput: MatchCampaignRequestInput,
  actorId?: string | null,
): Promise<{
  matcher: CampaignMatcher;
  campaigns: Campaign[];
  aiGenerated: boolean;
}> {
  const parsed = MatchCampaignRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      "Parameter pencocokan kampanye dan logistik tidak valid",
      { details: parsed.error.flatten() },
    );
  }

  const input = parsed.data;
  const [verifiedCampaigns, priceCatalog] = await Promise.all([
    handleListVerifiedCampaigns(),
    loadActivePriceCatalog(),
  ]);

  const peopleCount = input.affectedPeopleEstimate ?? 150;
  const { items: deterministicLogistics, totalEstimatedCostIdr, priceMap } =
    computeDeterministicLogistics({
      catalog: priceCatalog,
      peopleCount,
      durationDays: input.durationDays,
    });

  const allowedCandidates: AllowedCampaignCandidate[] = verifiedCampaigns.map(
    (c) => ({
      id: c.id,
      url: c.url,
      status: c.status,
      verification: c.verification,
    }),
  );

  const deterministicResult = applyCampaignMatcherGuard(
    buildDeterministicCampaignMatcherResult({
      hazardType: input.hazardType,
      affectedArea: input.affectedArea,
      severity: input.severity,
      affectedPeopleEstimate: input.affectedPeopleEstimate,
      durationDays: input.durationDays,
      verifiedCampaigns,
      logistics: deterministicLogistics,
      totalEstimatedCostIdr,
    }),
    allowedCandidates,
    priceMap,
  );

  if (!input.useAi || !hasGeminiConfig()) {
    return {
      matcher: deterministicResult,
      campaigns: verifiedCampaigns,
      aiGenerated: false,
    };
  }

  const promptCandidates: CampaignCandidatePromptItem[] = verifiedCampaigns.map(
    (c) => ({
      campaign_id: c.id,
      title: c.title,
      category: c.category,
      summary: c.summary,
      beneficiary_area: c.area,
      campaign_url: c.url,
    }),
  );

  const prompt = buildCampaignMatcherPrompt({
    hazardType: input.hazardType,
    affectedArea: input.affectedArea,
    severity: input.severity,
    affectedPeopleEstimate: input.affectedPeopleEstimate,
    durationDays: input.durationDays,
    candidates: promptCandidates,
    deterministicLogistics,
  });

  try {
    const aiRes = await generateStructuredWithMeta({
      featureKey: AI_FEATURE_KEYS.CAMPAIGN_MATCHER,
      schema: CampaignMatcherSchema,
      prompt,
      systemInstruction: CAMPAIGN_MATCHER_SYSTEM_INSTRUCTION,
    });

    const guarded = applyCampaignMatcherGuard(
      aiRes.data,
      allowedCandidates,
      priceMap,
    );

    void recordAiAnalysisRun({
      featureKey: AI_FEATURE_KEYS.CAMPAIGN_MATCHER,
      actorId: actorId ?? null,
      modelId: aiRes.meta.modelId,
      promptVersion: aiRes.meta.promptVersion,
      schemaVersion: aiRes.meta.schemaVersion,
      inputHash: aiRes.meta.inputHash,
      status: "succeeded",
      latencyMs: aiRes.meta.latencyMs,
    });

    return {
      matcher: guarded,
      campaigns: verifiedCampaigns,
      aiGenerated: true,
    };
  } catch (error) {
    void recordAiAnalysisRun({
      featureKey: AI_FEATURE_KEYS.CAMPAIGN_MATCHER,
      actorId: actorId ?? null,
      modelId: envConfig.gemini.model,
      promptVersion: "campaign-matcher-v1.0",
      schemaVersion: "1.0.0",
      inputHash: input.affectedArea,
      status:
        error instanceof ApiError && error.code === "INVALID_SCHEMA"
          ? "rejected_by_guard"
          : "failed",
      errorCode: error instanceof ApiError ? error.code : "CAMPAIGN_AI_ERROR",
    });

    return {
      matcher: deterministicResult,
      campaigns: verifiedCampaigns,
      aiGenerated: false,
    };
  }
}