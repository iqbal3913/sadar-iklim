// src/controllers/mangrove.controller.ts
import "server-only";
import { z } from "zod";
import { handleAnalyzeVision } from "@/controllers/vision.controller";
import { VisionTriageSchema } from "@/lib/ai";
import { ApiError } from "@/lib/api";
import { survivalRate } from "@/lib/format";
import { mangroveAudits } from "@/lib/mock/campaigns";
import {
  getSupabaseAdminClient,
  recordAuditLog,
} from "@/lib/supabase/admin";
import { getServerActor, requireServerRole } from "@/lib/supabase/server";
import type { LatLng, MangroveAudit } from "@/lib/types";

const CreateMangroveAuditSchema = z
  .object({
    plotCode: z
      .string()
      .trim()
      .min(3, "Kode plot minimal 3 karakter")
      .max(80),
    plotName: z
      .string()
      .trim()
      .min(3, "Nama plot minimal 3 karakter")
      .max(160),
    lat: z.coerce.number().min(-90).max(90).default(-3.84),
    lng: z.coerce.number().min(-180).max(180).default(102.31),
    observedAt: z.string().trim().optional(),
    plantedCount: z.number().int().min(0).nullable().optional(),
    survivingCount: z.number().int().min(0).nullable().optional(),
    photo: z.string().trim().min(1, "Foto plot wajib disertakan"),
    sampleId: z.string().trim().optional(),
    humanNotes: z.string().trim().max(500).optional(),
    dataMode: z.enum(["live", "simulation"]).default("live"),
  })
  .superRefine((val, ctx) => {
    const planted = val.plantedCount ?? null;
    const surviving = val.survivingCount ?? null;
    if (surviving !== null && planted === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plantedCount"],
        message: "Isi jumlah bibit ditanam sebagai pembagi survival rate",
      });
    }
    if (surviving !== null && planted !== null && surviving > planted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["survivingCount"],
        message: "Jumlah bibit hidup tidak boleh melebihi jumlah bibit ditanam",
      });
    }
  });

const ReviewMangroveAuditSchema = z.object({
  id: z.string().trim().min(1),
  verification: z.enum(["pending", "verified", "rejected"]),
  reason: z.string().trim().max(400).optional(),
});

export type CreateMangroveAuditInput = z.input<
  typeof CreateMangroveAuditSchema
>;

export interface MangroveAuditWithRate extends MangroveAudit {
  confirmedSurvivalRatePct: number | null;
}

function parsePointCoordinate(
  rawLocation: unknown,
  fallback: LatLng = [-3.8352, 102.3019],
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

function mapDbAuditRowToUi(row: Record<string, unknown>): MangroveAuditWithRate {
  const plantedCount =
    typeof row.planted_count === "number" ? row.planted_count : null;
  const survivingCount =
    typeof row.surviving_count === "number" ? row.surviving_count : null;

  const parsedAi = VisionTriageSchema.safeParse(row.ai_result);
  const mangroveAi = parsedAi.success
    ? parsedAi.data.mangrove_assessment
    : null;

  const rawCondition = mangroveAi?.vegetation_condition ?? "not_assessable";
  const condition: MangroveAudit["condition"] =
    rawCondition === "healthy_appearing" ||
    rawCondition === "needs_attention" ||
    rawCondition === "severely_damaged_appearing"
      ? rawCondition
      : "not_assessable";

  const rawErosion = String(row.erosion_risk ?? "unknown");
  const erosionRisk: MangroveAudit["erosionRisk"] =
    rawErosion === "low" || rawErosion === "moderate" || rawErosion === "high"
      ? rawErosion
      : "unknown";

  const rawVerification = String(row.verification_status ?? "pending");
  const verification: MangroveAudit["verification"] =
    rawVerification === "verified" || rawVerification === "rejected"
      ? rawVerification
      : "pending";

  const confirmedSurvivalRatePct = survivalRate(plantedCount, survivingCount);

  return {
    id: String(row.id),
    plotCode: String(row.plot_code ?? ""),
    plotName: String(row.plot_name ?? ""),
    observedAt: String(row.observed_at ?? new Date().toISOString()),
    position: parsePointCoordinate(row.location),
    plantedCount,
    survivingCount,
    verification,
    erosionRisk,
    condition,
    visibleSeedlings: mangroveAi?.estimated_visible_seedlings ?? null,
    stressSigns: mangroveAi?.visible_stress_signs ?? ["unclear"],
    limitations: parsedAi.success
      ? parsedAi.data.limitations
      : ["Survival rate wajib dihitung dari hitungan lapangan"],
    photo: String(row.photo_path ?? "/demo/mangrove-healthy.svg"),
    confirmedSurvivalRatePct,
  };
}

/**
 * Mengambil daftar Eco-Audit Mangrove beserta nilai deterministik `confirmedSurvivalRatePct`.
 */
export async function handleListMangroveAudits(options?: {
  plotCode?: string | null;
}): Promise<MangroveAuditWithRate[]> {
  const filterPlot = options?.plotCode?.trim().toUpperCase() || null;

  const baseList: MangroveAuditWithRate[] = mangroveAudits.map((a) => ({
    ...a,
    confirmedSurvivalRatePct: survivalRate(a.plantedCount, a.survivingCount),
  }));

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return filterPlot
      ? baseList.filter((a) => a.plotCode.toUpperCase() === filterPlot)
      : baseList;
  }

  try {
    let query = admin
      .from("mangrove_audits")
      .select("*")
      .order("observed_at", { ascending: false })
      .limit(100);

    if (filterPlot) {
      query = query.eq("plot_code", filterPlot);
    }

    const { data, error } = await query;
    if (error || !data) {
      return filterPlot
        ? baseList.filter((a) => a.plotCode.toUpperCase() === filterPlot)
        : baseList;
    }

    const dbAudits = data.map((r) =>
      mapDbAuditRowToUi(r as Record<string, unknown>),
    );
    const merged = [...dbAudits, ...baseList];
    return filterPlot
      ? merged.filter((a) => a.plotCode.toUpperCase() === filterPlot)
      : merged;
  } catch {
    return filterPlot
      ? baseList.filter((a) => a.plotCode.toUpperCase() === filterPlot)
      : baseList;
  }
}

/**
 * Membuat catatan Eco-Audit Mangrove baru:
 * - Taksiran kondisi daun/stres berasal dari Vision AI (`mangrove_assessment`).
 * - `confirmedSurvivalRatePct` dihitung 100% secara deterministik dari `survivingCount / plantedCount * 100` (PRD Bab 2.2 & 4.2.4).
 */
export async function handleCreateMangroveAudit(
  request: Request,
  rawBody: unknown,
): Promise<MangroveAuditWithRate> {
  const actor = await getServerActor(request);
  const parsed = CreateMangroveAuditSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      parsed.error.issues[0]?.message ?? "Data audit mangrove tidak valid",
      { details: parsed.error.flatten() },
    );
  }

  const input = parsed.data;
  const plantedCount = input.plantedCount ?? null;
  const survivingCount = input.survivingCount ?? null;
  const confirmedSurvivalRatePct = survivalRate(plantedCount, survivingCount);
  const observedIso = input.observedAt
    ? new Date(input.observedAt).toISOString()
    : new Date().toISOString();

  const visionRes = await handleAnalyzeVision(
    {
      sampleId: input.sampleId,
      imageBase64: input.photo,
      expectedMode: "mangrove_audit",
      title: `${input.plotCode} - ${input.plotName}`,
      description: input.humanNotes,
      village: input.plotName,
      observedAt: observedIso,
    },
    actor?.id ?? null,
  );

  const mangroveAi = visionRes.rawContract.mangrove_assessment;

  const condition: MangroveAudit["condition"] =
    mangroveAi.vegetation_condition === "healthy_appearing" ||
    mangroveAi.vegetation_condition === "needs_attention" ||
    mangroveAi.vegetation_condition === "severely_damaged_appearing"
      ? mangroveAi.vegetation_condition
      : "not_assessable";

  const erosionRisk: MangroveAudit["erosionRisk"] =
    mangroveAi.shoreline_erosion_visual_risk === "low" ||
    mangroveAi.shoreline_erosion_visual_risk === "moderate" ||
    mangroveAi.shoreline_erosion_visual_risk === "high"
      ? mangroveAi.shoreline_erosion_visual_risk
      : "unknown";

  const createdAudit: MangroveAuditWithRate = {
    id: `m-${Date.now()}`,
    plotCode: input.plotCode,
    plotName: input.plotName,
    observedAt: observedIso,
    position: [input.lat, input.lng],
    plantedCount,
    survivingCount,
    verification: "pending",
    erosionRisk,
    condition,
    visibleSeedlings: mangroveAi.estimated_visible_seedlings,
    stressSigns:
      mangroveAi.visible_stress_signs.length > 0
        ? mangroveAi.visible_stress_signs
        : ["none_obvious"],
    limitations: visionRes.rawContract.limitations,
    photo: input.photo,
    confirmedSurvivalRatePct,
  };

  const admin = getSupabaseAdminClient();
  if (admin && actor && !actor.isDemoAccount) {
    try {
      const pointWkt = `SRID=4326;POINT(${input.lng} ${input.lat})`;
      const { data: inserted } = await admin
        .from("mangrove_audits")
        .insert({
          submitted_by: actor.id,
          plot_code: input.plotCode,
          plot_name: input.plotName,
          location: pointWkt,
          photo_bucket: "mangrove-audit-private",
          photo_path: input.sampleId ? input.photo : "inline-preview",
          observed_at: observedIso,
          planted_count: plantedCount,
          surviving_count: survivingCount,
          survival_rate: confirmedSurvivalRatePct,
          ai_result: visionRes.rawContract,
          erosion_risk: erosionRisk,
          human_notes: input.humanNotes ?? null,
          verification_status: "pending",
          data_mode: input.dataMode,
        })
        .select("id")
        .maybeSingle();

      if (inserted?.id) {
        createdAudit.id = String(inserted.id);
      }
    } catch {
      // Lanjutkan pengembalian objek audit ke client
    }
  }

  return createdAudit;
}

/**
 * Memverifikasi atau menolak catatan Eco-Audit Mangrove oleh Petugas BPBD.
 */
export async function handleReviewMangroveAudit(
  request: Request,
  rawBody: unknown,
): Promise<{
  id: string;
  verification: MangroveAudit["verification"];
  reviewedAt: string;
}> {
  const officer = await requireServerRole(request, [
    "bpbd_admin",
    "super_admin",
  ]);
  const parsed = ReviewMangroveAuditSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      "Parameter verifikasi audit mangrove tidak valid",
    );
  }

  const { id, verification, reason } = parsed.data;
  const reviewedAt = new Date().toISOString();

  const admin = getSupabaseAdminClient();
  if (admin && !officer.isDemoAccount) {
    try {
      await admin
        .from("mangrove_audits")
        .update({
          verification_status: verification,
          reviewed_by: officer.id,
          reviewed_at: reviewedAt,
        })
        .eq("id", id);
    } catch {
      // Abaikan jika ID berasal dari fixture lokal
    }
  }

  void recordAuditLog({
    actorId: officer.isDemoAccount ? null : officer.id,
    actorRole: officer.role,
    action: `REVIEW_MANGROVE_${verification.toUpperCase()}`,
    entityType: "mangrove_audits",
    entityId: id,
    afterState: { verification, reviewedAt },
    reason: reason ?? null,
  });

  return { id, verification, reviewedAt };
}