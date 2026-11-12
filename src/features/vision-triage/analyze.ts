import type { VisionResult } from "@/lib/types";
import { samplePhotos } from "@/lib/mock/samples";

const generic: VisionResult = {
  classification: "unclassifiable",
  urgency: "moderate",
  confidence: "low",
  waterDepthCm: null,
  depthBasis: "no_reliable_reference",
  observations: ["Foto diterima untuk diperiksa", "Analisis otomatis tahap contoh tidak membaca isi gambar"],
  hazards: [],
  limitations: ["Hasil ini contoh tampilan. Analisis nyata akan berasal dari Gemini Vision melalui server"],
  integrity: "inconclusive",
  nextAction: "Perlu pemeriksaan petugas",
  reviewRequired: true,
};

export async function analyzePhoto(input: { sampleId?: string }): Promise<VisionResult> {
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const sample = samplePhotos.find((s) => s.id === input.sampleId);
  return sample ? sample.result : generic;
}
