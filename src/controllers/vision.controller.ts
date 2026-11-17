// src/controllers/vision.controller.ts
import "server-only";
import { z } from "zod";
import {
  AI_FEATURE_KEYS,
  ALLOWED_VISION_MIME_TYPES,
  type AllowedVisionMimeType,
  MAX_IMAGE_BYTES,
  VISION_TRIAGE_SYSTEM_INSTRUCTION,
  VisionTriageSchema,
  type VisionTriage,
  applyVisionTriageGuard,
  buildVisionTriagePrompt,
  generateStructuredWithMeta,
  mapVisionTriageToVisionResult,
  stripBase64DataUrlPrefix,
} from "@/lib/ai";
import { ApiError } from "@/lib/api";
import { envConfig, hasGeminiConfig } from "@/lib/env-config";
import { samplePhotos } from "@/lib/mock/samples";
import { recordAiAnalysisRun } from "@/lib/supabase/admin";
import type { SamplePhoto, VisionResult } from "@/lib/types";

const VisionAnalyzeRequestSchema = z.object({
  sampleId: z.string().trim().max(120).optional(),
  imageBase64: z.string().trim().optional(),
  mimeType: z.enum(ALLOWED_VISION_MIME_TYPES).optional(),
  expectedMode: z
    .enum(["flood_report", "mangrove_audit"])
    .default("flood_report"),
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(600).optional(),
  village: z.string().trim().max(120).optional(),
  observedAt: z.string().trim().max(64).optional(),
});

export type VisionAnalyzeRequestInput = z.input<
  typeof VisionAnalyzeRequestSchema
>;

export interface VisionControllerOutput {
  result: VisionResult;
  rawContract: VisionTriage;
  aiGenerated: boolean;
  modelId: string;
  promptVersion: string;
  schemaVersion: string;
}

/**
 * Mengekstrak MIME type dari prefix Data URL (mis. data:image/jpeg;base64,...) bila ada.
 */
function extractMimeFromDataUrl(
  rawInput: string,
): AllowedVisionMimeType | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,/i.exec(
    rawInput.trim(),
  );
  if (!match) return null;
  const candidate = match[1].toLowerCase();
  if (
    candidate === "image/jpeg" ||
    candidate === "image/png" ||
    candidate === "image/webp"
  ) {
    return candidate;
  }
  return null;
}

/**
 * Memeriksa kesesuaian magic bytes (header biner file gambar) sesuai PRD Bab 3.6.
 */
function verifyImageMagicBytes(
  buffer: Buffer,
  expectedMime: AllowedVisionMimeType,
): boolean {
  if (buffer.length < 12) return false;

  if (expectedMime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (expectedMime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  if (expectedMime === "image/webp") {
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
  }

  return false;
}

/**
 * Mengonversi SamplePhoto bawaan menjadi kontrak penuh VisionTriageSchema
 * yang telah melewati validator Zod dan domain guard.
 */
function buildSampleVisionContract(sample: SamplePhoto): VisionTriage {
  const r = sample.result;
  const isMangrove = sample.kind === "mangrove_audit";
  const isStressedMangrove = sample.id === "sample-mangrove-stressed";

  const validClassification: VisionTriage["classification"] =
    r.classification === "flooding" ||
    r.classification === "fast_water_flow" ||
    r.classification === "road_damage" ||
    r.classification === "road_inaccessible" ||
    r.classification === "mangrove_vegetation" ||
    r.classification === "shoreline_erosion_signs" ||
    r.classification === "other"
      ? r.classification
      : "unclassifiable";

  const validBasis: VisionTriage["flood_assessment"]["depth_estimation_basis"] =
    r.depthBasis === "visible_scale_reference" ||
    r.depthBasis === "user_provided_reference" ||
    r.depthBasis === "no_reliable_reference" ||
    r.depthBasis === "not_applicable"
      ? r.depthBasis
      : isMangrove
        ? "not_applicable"
        : "no_reliable_reference";

  const rawContract: VisionTriage = {
    report_type: sample.kind,
    classification: validClassification,
    visual_observations: r.observations.slice(0, 12),
    hazards: {
      visible_fast_flow: r.hazards.some((h) =>
        h.toLowerCase().includes("arus deras"),
      ),
      visible_road_damage: r.hazards.some((h) =>
        h.toLowerCase().includes("kerusakan jalan"),
      ),
      visible_inundation:
        !isMangrove &&
        (validClassification === "flooding" ||
          r.hazards.some((h) => h.toLowerCase().includes("genangan"))),
      person_potentially_needing_assistance_visible: false,
      debris_or_obstruction_visible: r.hazards.some((h) =>
        h.toLowerCase().includes("puing"),
      ),
    },
    flood_assessment: {
      estimated_water_depth_cm: isMangrove ? null : r.waterDepthCm,
      depth_estimation_basis: validBasis,
      depth_confidence: isMangrove ? null : r.confidence,
    },
    mangrove_assessment: {
      vegetation_condition: isMangrove
        ? isStressedMangrove
          ? "needs_attention"
          : "healthy_appearing"
        : "not_applicable",
      estimated_visible_seedlings: isMangrove
        ? isStressedMangrove
          ? 12
          : 18
        : null,
      visible_stress_signs: isMangrove
        ? isStressedMangrove
          ? ["yellowing_leaves", "exposed_roots"]
          : ["none_obvious"]
        : [],
      shoreline_erosion_visual_risk: isMangrove
        ? isStressedMangrove
          ? "moderate"
          : "low"
        : "not_applicable",
    },
    image_quality: {
      blur: "low",
      visibility: "clear",
      sufficient_for_assessment: true,
    },
    visual_integrity_assessment: r.integrity,
    urgency: r.urgency,
    recommended_next_action: r.nextAction,
    confidence: r.confidence,
    limitations: r.limitations.slice(0, 10),
    review_required: true,
  };

  return applyVisionTriageGuard(VisionTriageSchema.parse(rawContract));
}

function buildFallbackVisionContract(
  mode: "flood_report" | "mangrove_audit",
): VisionTriage {
  const isMangrove = mode === "mangrove_audit";
  const contract: VisionTriage = {
    report_type: mode,
    classification: isMangrove ? "mangrove_vegetation" : "unclassifiable",
    visual_observations: [
      "Foto berhasil diterima oleh server untuk pemeriksaan",
      "Analisis visual otomatis membutuhkan verifikasi langsung oleh petugas",
    ],
    hazards: {
      visible_fast_flow: false,
      visible_road_damage: false,
      visible_inundation: !isMangrove,
      person_potentially_needing_assistance_visible: false,
      debris_or_obstruction_visible: false,
    },
    flood_assessment: {
      estimated_water_depth_cm: null,
      depth_estimation_basis: isMangrove
        ? "not_applicable"
        : "no_reliable_reference",
      depth_confidence: null,
    },
    mangrove_assessment: {
      vegetation_condition: isMangrove ? "not_assessable" : "not_applicable",
      estimated_visible_seedlings: null,
      visible_stress_signs: isMangrove ? ["unclear"] : [],
      shoreline_erosion_visual_risk: isMangrove ? "unknown" : "not_applicable",
    },
    image_quality: {
      blur: "moderate",
      visibility: "partially_obstructed",
      sufficient_for_assessment: false,
    },
    visual_integrity_assessment: "inconclusive",
    urgency: "moderate",
    recommended_next_action:
      "Perlu pemeriksaan petugas BPBD atau pendamping lapangan sebelum tindak lanjut",
    confidence: "low",
    limitations: [
      "Layanan inferensi Vision AI sedang tidak tersedia atau membutuhkan pemeriksaan manual",
      "Kedalaman genangan maupun survival rate tidak dapat disimpulkan dari satu foto",
    ],
    review_required: true,
  };

  return applyVisionTriageGuard(contract);
}

/**
 * Menjalankan analisis multimodal Vision AI untuk Triase Banjir atau Eco-Audit Mangrove.
 */
export async function handleAnalyzeVision(
  rawInput: VisionAnalyzeRequestInput,
  actorId?: string | null,
): Promise<VisionControllerOutput> {
  const parsed = VisionAnalyzeRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ApiError("BAD_REQUEST", "Parameter analisis foto tidak valid", {
      details: parsed.error.flatten(),
    });
  }

  const input = parsed.data;
  const featureKey =
    input.expectedMode === "mangrove_audit"
      ? AI_FEATURE_KEYS.MANGROVE_VISION
      : AI_FEATURE_KEYS.VISION_TRIAGE;

  // 1. Jalur 1-Click Sample Photo (Judge Mode & Form Demo)
  if (input.sampleId) {
    const sample = samplePhotos.find((s) => s.id === input.sampleId);
    if (!sample) {
      throw new ApiError(
        "NOT_FOUND",
        `Sampel foto "${input.sampleId}" tidak ditemukan`,
      );
    }

    const contract = buildSampleVisionContract(sample);
    return {
      result: sample.result,
      rawContract: contract,
      aiGenerated: false,
      modelId: "sample-fixture-v1",
      promptVersion: "sample-fixture-v1.0",
      schemaVersion: "1.0.0",
    };
  }

  // 2. Jika imageBase64 merupakan path relatif ke /demo/*.svg, petakan ke sampel yang sesuai
  if (input.imageBase64 && input.imageBase64.startsWith("/demo/")) {
    const matchedSample = samplePhotos.find((s) => s.src === input.imageBase64);
    if (matchedSample) {
      const contract = buildSampleVisionContract(matchedSample);
      return {
        result: matchedSample.result,
        rawContract: contract,
        aiGenerated: false,
        modelId: "sample-fixture-v1",
        promptVersion: "sample-fixture-v1.0",
        schemaVersion: "1.0.0",
      };
    }
  }

  if (!input.imageBase64) {
    throw new ApiError(
      "BAD_REQUEST",
      "Harap sertakan foto (imageBase64) atau pilih salah satu sampleId yang tersedia",
    );
  }

  // 3. Validasi MIME, ukuran byte, dan magic bytes gambar unggahan
  const detectedMime =
    input.mimeType ?? extractMimeFromDataUrl(input.imageBase64) ?? "image/jpeg";
  const cleanBase64 = stripBase64DataUrlPrefix(input.imageBase64);
  const imageBuffer = Buffer.from(cleanBase64, "base64");

  if (imageBuffer.byteLength === 0) {
    throw new ApiError("BAD_REQUEST", "Data gambar kosong atau rusak");
  }

  if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new ApiError(
      "BAD_REQUEST",
      "Ukuran foto melebihi batas maksimum 8 MB",
    );
  }

  if (!verifyImageMagicBytes(imageBuffer, detectedMime)) {
    throw new ApiError(
      "BAD_REQUEST",
      "Header biner file tidak sesuai dengan format JPEG, PNG, atau WebP yang diizinkan",
    );
  }

  // 4. Fallback terkontrol bila GEMINI_API_KEY belum diisi pada environment lokal
  if (!hasGeminiConfig()) {
    const fallbackContract = buildFallbackVisionContract(input.expectedMode);
    return {
      result: mapVisionTriageToVisionResult(fallbackContract),
      rawContract: fallbackContract,
      aiGenerated: false,
      modelId: "fallback-no-key",
      promptVersion: "vision-triage-v1.0",
      schemaVersion: "1.0.0",
    };
  }

  const prompt = buildVisionTriagePrompt({
    expectedMode: input.expectedMode,
    userTitle: input.title,
    userDescription: input.description,
    villageName: input.village,
    observedAtIso: input.observedAt,
  });

  try {
    const aiRes = await generateStructuredWithMeta({
      featureKey,
      schema: VisionTriageSchema,
      prompt,
      systemInstruction: VISION_TRIAGE_SYSTEM_INSTRUCTION,
      image: {
        mimeType: detectedMime,
        base64: cleanBase64,
      },
    });

    const guarded = applyVisionTriageGuard(aiRes.data);

    void recordAiAnalysisRun({
      featureKey,
      actorId: actorId ?? null,
      modelId: aiRes.meta.modelId,
      promptVersion: aiRes.meta.promptVersion,
      schemaVersion: aiRes.meta.schemaVersion,
      inputHash: aiRes.meta.inputHash,
      status: "succeeded",
      latencyMs: aiRes.meta.latencyMs,
    });

    return {
      result: mapVisionTriageToVisionResult(guarded),
      rawContract: guarded,
      aiGenerated: true,
      modelId: aiRes.meta.modelId,
      promptVersion: aiRes.meta.promptVersion,
      schemaVersion: aiRes.meta.schemaVersion,
    };
  } catch (error) {
    void recordAiAnalysisRun({
      featureKey,
      actorId: actorId ?? null,
      modelId: envConfig.gemini.model,
      promptVersion: "vision-triage-v1.0",
      schemaVersion: "1.0.0",
      inputHash: "failed-vision-run",
      status:
        error instanceof ApiError && error.code === "INVALID_SCHEMA"
          ? "rejected_by_guard"
          : "failed",
      errorCode: error instanceof ApiError ? error.code : "VISION_ERROR",
    });

    const fallbackContract = buildFallbackVisionContract(input.expectedMode);
    return {
      result: mapVisionTriageToVisionResult(fallbackContract),
      rawContract: fallbackContract,
      aiGenerated: false,
      modelId: envConfig.gemini.model,
      promptVersion: "vision-triage-v1.0",
      schemaVersion: "1.0.0",
    };
  }
}