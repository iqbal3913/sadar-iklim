// src/lib/ai/prompts/ibf.prompt.ts
import "server-only";
import type { ImpactLevel } from "@/lib/types";

export const IBF_SYSTEM_INSTRUCTION = [
  "Anda adalah penyusun Buletin Peringatan Dini Berbasis Dampak (Impact-Based Forecasting / IBF) untuk platform SadarIklim.",
  "Tugas Anda adalah menerjemahkan data telemetri resmi dan hasil rule engine deterministik menjadi rekomendasi tindakan lokal dalam Bahasa Indonesia yang singkat, jelas, dan mudah dipahami.",
  "ATURAN KESELAMATAN WAJIB:",
  "1. Gunakan HANYA evidence_id dan candidate_route_id yang tersedia pada data input server. Dilarang keras mengarang ID baru.",
  "2. Nilai impact_level wajib mengikuti nilai deterministik yang diberikan server.",
  "3. Seluruh rekomendasi rute evakuasi publik wajib menyertakan requires_officer_approval = true dan official_instruction_required = true.",
  "4. Jangan menyatakan keluaran ini sebagai perintah evakuasi resmi; selalu arahkan warga untuk mengikuti instruksi resmi BMKG, BNPB, dan BPBD setempat.",
].join("\n");

export interface IbfPromptEvidenceInput {
  evidence_id: string;
  source:
    | "BMKG"
    | "OPEN_METEO"
    | "BNPB_INARISK"
    | "NASA_FIRMS"
    | "CITIZEN_REPORT"
    | "INTERNAL_RULE";
  observation: string;
  observed_at: string | null;
}

export interface IbfPromptRouteInput {
  candidate_route_id: string;
  name: string;
  decision: "recommended" | "caution" | "not_recommended";
  rationale: string;
  affected_segments: number;
}

export interface IbfPromptInput {
  adm4Code: string;
  villageName: string;
  districtName: string | null;
  provinceName: string;
  deterministicHazardType:
    | "coastal_flood"
    | "extreme_rainfall"
    | "high_waves"
    | "strong_wind"
    | "earthquake"
    | "tsunami_related_alert"
    | "wildfire_smoke"
    | "multi_hazard"
    | "unknown";
  deterministicImpactLevel: ImpactLevel;
  validFromIso: string;
  validUntilIso: string;
  generatedAtIso: string;
  evidenceList: IbfPromptEvidenceInput[];
  candidateRoutes: IbfPromptRouteInput[];
  exposedFacilitiesCount: number;
}

export function buildIBFBulletinPrompt(input: IbfPromptInput): string {
  return [
    "Susun Buletin IBF (JSON) berdasarkan konteks deterministik server berikut:",
    JSON.stringify(
      {
        location: {
          adm4_code: input.adm4Code,
          village_name: input.villageName,
          district_name: input.districtName,
          province_name: input.provinceName,
        },
        deterministic_hazard_type: input.deterministicHazardType,
        deterministic_impact_level: input.deterministicImpactLevel,
        valid_from: input.validFromIso,
        valid_until: input.validUntilIso,
        generated_at: input.generatedAtIso,
        exposed_facilities_count: input.exposedFacilitiesCount,
        allowed_evidence: input.evidenceList,
        allowed_candidate_routes: input.candidateRoutes,
      },
      null,
      2,
    ),
    "Pastikan setiap item pada actions.evidence_ids hanya merujuk pada allowed_evidence[].evidence_id di atas.",
  ].join("\n\n");
}