// src/features/vision-triage/analyze.ts
import type { VisionResult } from "@/lib/types";
import { samplePhotos } from "@/lib/mock/samples";

const generic: VisionResult = {
  classification: "unclassifiable",
  urgency: "moderate",
  confidence: "low",
  waterDepthCm: null,
  depthBasis: "no_reliable_reference",
  observations: [
    "Foto diterima untuk diperiksa",
    "Analisis otomatis membutuhkan pemeriksaan lanjutan oleh petugas",
  ],
  hazards: [],
  limitations: [
    "Kedalaman air tidak dapat diperkirakan tanpa pembanding ukuran yang jelas",
    "Memerlukan verifikasi petugas BPBD",
  ],
  integrity: "inconclusive",
  nextAction: "Perlu pemeriksaan petugas",
  reviewRequired: true,
};

export interface AnalyzePhotoInput {
  sampleId?: string;
  imageBase64?: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  mode?: "flood_report" | "mangrove_audit";
  title?: string;
  description?: string;
  village?: string;
  observedAt?: string;
}

export async function analyzePhoto(
  input: AnalyzePhotoInput,
): Promise<VisionResult> {
  const sample = input.sampleId
    ? samplePhotos.find((s) => s.id === input.sampleId)
    : undefined;

  const targetMode =
    input.mode ??
    (sample?.kind === "mangrove_audit" ? "mangrove_audit" : "flood_report");

  const endpoint =
    targetMode === "mangrove_audit"
      ? "/api/vision/mangrove"
      : "/api/vision/triage";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleId: input.sampleId,
        imageBase64: input.imageBase64,
        mimeType: input.mimeType,
        title: input.title,
        description: input.description,
        village: input.village,
        observedAt: input.observedAt,
      }),
    });

    const payload = (await res.json().catch(() => null)) as {
      status?: string;
      data?: { result?: VisionResult };
    } | null;

    if (res.ok && payload?.data?.result) {
      return payload.data.result;
    }
  } catch {
    // Gunakan fallback sampel lokal apabila jaringan terputus saat demo
  }

  return sample ? sample.result : generic;
}