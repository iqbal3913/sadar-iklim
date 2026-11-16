// src/controllers/reports.controller.ts
import "server-only";
import { z } from "zod";
import { handleAnalyzeVision } from "@/controllers/vision.controller";
import {
  VisionTriageSchema,
  mapVisionTriageToVisionResult,
} from "@/lib/ai";
import { ApiError } from "@/lib/api";
import { liveReports } from "@/lib/mock/live";
import { getScenario } from "@/lib/mock/scenarios";
import {
  getSupabaseAdminClient,
  recordAuditLog,
} from "@/lib/supabase/admin";
import { getServerActor, requireServerRole } from "@/lib/supabase/server";
import type { LatLng, Report, ReportStatus, VisionResult } from "@/lib/types";

const CreateReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Judul laporan minimal 5 karakter")
    .max(160, "Judul laporan maksimal 160 karakter"),
  type: z
    .enum(["flood_report", "road_damage", "coastal_hazard", "other"])
    .default("flood_report"),
  description: z.string().trim().max(1000).default(""),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  village: z.string().trim().max(120).default("Lokasi pelapor"),
  adm4Code: z.string().trim().max(20).optional().nullable(),
  observedAt: z.string().trim().optional(),
  photo: z.string().trim().min(1, "Foto wajib disertakan"),
  sampleId: z.string().trim().optional(),
  dataMode: z.enum(["live", "simulation"]).default("live"),
  scenarioCode: z.string().trim().optional().nullable(),
});

const ReviewReportSchema = z.object({
  status: z.enum(["verified", "rejected", "duplicate", "needs_review"]),
  reviewNote: z
    .string()
    .trim()
    .min(5, "Alasan verifikasi wajib diisi minimal 5 karakter")
    .max(500),
});

export type CreateReportInput = z.input<typeof CreateReportSchema>;
export type ReviewReportInput = z.input<typeof ReviewReportSchema>;

function maskReporterName(name: string): string {
  const clean = name.trim();
  if (!clean) return "Warga A***";
  const firstWord = clean.split(/\s+/)[0] ?? "Warga";
  return `Warga ${firstWord[0]?.toUpperCase() ?? "A"}***`;
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
  if (rawLocation !== null && typeof rawLocation === "object") {
    const geo = rawLocation as { coordinates?: unknown };
    if (
      Array.isArray(geo.coordinates) &&
      geo.coordinates.length >= 2 &&
      typeof geo.coordinates[0] === "number" &&
      typeof geo.coordinates[1] === "number"
    ) {
      return [geo.coordinates[1], geo.coordinates[0]];
    }
  }
  return fallback;
}

function parseStoredVisionResult(rawAi: unknown): VisionResult | null {
  if (!rawAi || typeof rawAi !== "object") return null;

  const parsedContract = VisionTriageSchema.safeParse(rawAi);
  if (parsedContract.success) {
    return mapVisionTriageToVisionResult(parsedContract.data);
  }

  const candidate = rawAi as Partial<VisionResult>;
  if (
    typeof candidate.classification === "string" &&
    typeof candidate.urgency === "string" &&
    Array.isArray(candidate.observations)
  ) {
    return candidate as VisionResult;
  }

  return null;
}

function mapDbReportRowToUi(row: Record<string, unknown>): Report {
  const rawStatus = String(row.status ?? "needs_review");
  const validStatus: ReportStatus =
    rawStatus === "submitted" ||
    rawStatus === "needs_review" ||
    rawStatus === "verified" ||
    rawStatus === "rejected" ||
    rawStatus === "duplicate"
      ? rawStatus
      : "needs_review";

  const rawType = String(row.report_type ?? "flood_report");
  const validType: Report["type"] =
    rawType === "flood_report" ||
    rawType === "road_damage" ||
    rawType === "coastal_hazard" ||
    rawType === "other"
      ? rawType
      : "flood_report";

  const rawSeverity = String(row.severity ?? "unknown");
  const validSeverity: Report["severity"] =
    rawSeverity === "low" ||
    rawSeverity === "moderate" ||
    rawSeverity === "high" ||
    rawSeverity === "critical"
      ? rawSeverity
      : "unknown";

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    type: validType,
    description: String(row.description ?? ""),
    position: parsePointCoordinate(row.location),
    village: String(row.village_name ?? "Lokasi pelapor"),
    observedAt: String(
      row.observed_at ?? row.submitted_at ?? new Date().toISOString(),
    ),
    submittedAt: String(
      row.submitted_at ?? row.created_at ?? new Date().toISOString(),
    ),
    status: validStatus,
    severity: validSeverity,
    reporterMasked: "Warga Terautentikasi",
    photo: String(row.photo_path ?? "/demo/flood-road-reference.svg"),
    ai: parseStoredVisionResult(row.ai_result),
    reviewNote: row.review_note ? String(row.review_note) : null,
    dataMode: row.data_mode === "simulation" ? "simulation" : "live",
  };
}

/**
 * Mengambil daftar laporan warga berdasarkan mode (`live` atau `simulation`) dan filter status.
 */
export async function handleListReports(options: {
  mode?: string | null;
  scenarioCode?: string | null;
  status?: string | null;
}): Promise<Report[]> {
  const isSim = (options.mode ?? "live").toLowerCase() === "simulation";
  const statusFilter = options.status?.trim().toLowerCase() ?? "all";

  const baseFallback = isSim
    ? (getScenario(options.scenarioCode || "ROB-URBAN-01")?.reports ?? [])
    : liveReports;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return baseFallback.filter(
      (r) => statusFilter === "all" || r.status === statusFilter,
    );
  }

  try {
    let query = admin
      .from("reports")
      .select("*")
      .eq("data_mode", isSim ? "simulation" : "live")
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error || !data) {
      return baseFallback.filter(
        (r) => statusFilter === "all" || r.status === statusFilter,
      );
    }

    const dbReports = data.map((row) =>
      mapDbReportRowToUi(row as Record<string, unknown>),
    );
    const merged = [...dbReports, ...baseFallback];
    return merged.filter(
      (r) => statusFilter === "all" || r.status === statusFilter,
    );
  } catch {
    return baseFallback.filter(
      (r) => statusFilter === "all" || r.status === statusFilter,
    );
  }
}

/**
 * Membuat laporan warga baru, menjalankan triase Vision AI otomatis, dan menetapkan status `needs_review`
 * agar laporan mentah tidak pernah menutup jalan secara otomatis (PRD Bab 4.2.2).
 */
export async function handleCreateReport(
  request: Request,
  rawBody: unknown,
): Promise<{ report: Report; vision: VisionResult }> {
  const actor = await getServerActor(request);
  const parsed = CreateReportSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ApiError("BAD_REQUEST", "Isian formulir laporan tidak valid", {
      details: parsed.error.flatten(),
    });
  }

  const input = parsed.data;
  const observedIso = input.observedAt
    ? new Date(input.observedAt).toISOString()
    : new Date().toISOString();
  const submittedIso = new Date().toISOString();

  const visionOutput = await handleAnalyzeVision(
    {
      sampleId: input.sampleId,
      imageBase64: input.photo,
      expectedMode: "flood_report",
      title: input.title,
      description: input.description,
      village: input.village,
      observedAt: observedIso,
    },
    actor?.id ?? null,
  );

  const newReport: Report = {
    id: `r-${Date.now()}`,
    title: input.title,
    type: input.type,
    description: input.description,
    position: [input.lat, input.lng],
    village: input.village,
    observedAt: observedIso,
    submittedAt: submittedIso,
    status: "needs_review",
    severity: visionOutput.result.urgency,
    reporterMasked: actor ? maskReporterName(actor.displayName) : "Anda",
    photo: input.photo,
    ai: visionOutput.result,
    reviewNote: null,
    dataMode: input.dataMode,
  };

  const admin = getSupabaseAdminClient();
  if (admin && actor && !actor.isDemoAccount) {
    try {
      const pointWkt = `SRID=4326;POINT(${input.lng} ${input.lat})`;
      const { data: inserted } = await admin
        .from("reports")
        .insert({
          submitted_by: actor.id,
          report_type: input.type,
          title: input.title,
          description: input.description,
          location: pointWkt,
          adm4_code: input.adm4Code ?? null,
          village_name: input.village,
          photo_bucket: "incident-media-private",
          photo_path: input.sampleId ? input.photo : "inline-preview",
          observed_at: observedIso,
          submitted_at: submittedIso,
          status: "needs_review",
          severity: visionOutput.result.urgency,
          ai_result: visionOutput.rawContract,
          ai_model: visionOutput.modelId,
          schema_version: visionOutput.schemaVersion,
          prompt_version: visionOutput.promptVersion,
          data_mode: "live",
        })
        .select("id")
        .maybeSingle();

      if (inserted?.id) {
        newReport.id = String(inserted.id);
      }
    } catch {
      // Tetap kembalikan objek Report ke client jika penyisipan DB gagal pada akun demo
    }
  }

  return {
    report: newReport,
    vision: visionOutput.result,
  };
}

/**
 * Memverifikasi, menolak, atau menandai duplikat laporan oleh Petugas BPBD (`bpbd_admin` / `super_admin`)
 * dan mencatat jejak audit ke `public.audit_logs` (PRD Bab 3.6 & 4.2.2).
 */
export async function handleReviewReport(
  request: Request,
  reportId: string,
  rawBody: unknown,
): Promise<{
  id: string;
  status: ReportStatus;
  reviewNote: string;
  reviewedAt: string;
  reviewedBy: string;
}> {
  const officer = await requireServerRole(request, [
    "bpbd_admin",
    "super_admin",
  ]);
  const cleanId = reportId.trim();
  if (!cleanId) {
    throw new ApiError("BAD_REQUEST", "ID laporan wajib diisi");
  }

  const parsed = ReviewReportSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      parsed.error.issues[0]?.message ??
        "Alasan wajib diisi minimal 5 karakter",
      { details: parsed.error.flatten() },
    );
  }

  const { status, reviewNote } = parsed.data;
  const reviewedAt = new Date().toISOString();

  const admin = getSupabaseAdminClient();
  if (admin && !officer.isDemoAccount) {
    try {
      await admin
        .from("reports")
        .update({
          status,
          review_note: reviewNote,
          reviewed_by: officer.id,
          reviewed_at: reviewedAt,
        })
        .eq("id", cleanId);
    } catch {
      // Lanjutkan pencatatan audit meskipun ID berasal dari laporan fixture lokal
    }
  }

  void recordAuditLog({
    actorId: officer.isDemoAccount ? null : officer.id,
    actorRole: officer.role,
    action: `REVIEW_REPORT_${status.toUpperCase()}`,
    entityType: "reports",
    entityId: cleanId,
    afterState: { status, reviewNote, reviewedAt },
    reason: reviewNote,
  });

  return {
    id: cleanId,
    status,
    reviewNote,
    reviewedAt,
    reviewedBy: officer.displayName,
  };
}

/**
 * Menghapus/menarik laporan. Warga dapat menarik laporannya yang masih `needs_review`,
 * sedangkan Petugas BPBD dapat menghapus laporan mana pun.
 */
export async function handleDeleteReport(
  request: Request,
  reportId: string,
): Promise<{ id: string; deletedAt: string }> {
  const actor = await requireServerRole(request);
  const cleanId = reportId.trim();
  if (!cleanId) {
    throw new ApiError("BAD_REQUEST", "ID laporan tidak valid");
  }

  const admin = getSupabaseAdminClient();
  if (admin && !actor.isDemoAccount) {
    try {
      let query = admin.from("reports").delete().eq("id", cleanId);
      if (actor.role !== "bpbd_admin" && actor.role !== "super_admin") {
        query = query
          .eq("submitted_by", actor.id)
          .in("status", ["submitted", "needs_review"]);
      }
      await query;
    } catch {
      // Abaikan jika ID merupakan bagian dari state demo lokal
    }
  }

  const deletedAt = new Date().toISOString();
  void recordAuditLog({
    actorId: actor.isDemoAccount ? null : actor.id,
    actorRole: actor.role,
    action: "DELETE_OR_WITHDRAW_REPORT",
    entityType: "reports",
    entityId: cleanId,
    afterState: { deletedAt },
  });

  return { id: cleanId, deletedAt };
}