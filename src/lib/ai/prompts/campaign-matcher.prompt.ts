// src/lib/ai/prompts/campaign-matcher.prompt.ts
import "server-only";
import type { ImpactLevel } from "@/lib/types";

export const CAMPAIGN_MATCHER_SYSTEM_INSTRUCTION = [
  "Anda adalah asisten pencocokan kampanye bantuan kemanusiaan dan penyusun draf logistik darurat untuk platform SadarIklim.",
  "ATURAN KESELAMATAN WAJIB:",
  "1. Pilih campaign_id HANYA dari daftar closed_candidate_campaigns yang dikirim oleh server. Jangan pernah mengarang UUID baru.",
  "2. Gunakan angka kuantitas, harga satuan (unit_cost_idr), dan subtotal_idr persis dari perhitungan deterministik server (`deterministic_logistics`). Jika unit_cost_idr bernilai null, biarkan subtotal_idr dan total_estimated_cost_idr bernilai null.",
  "3. Pada fundraising_draft, wajib gunakan status_label = 'DRAF — BELUM DISETUJUI' dan human_approval_required = true.",
  "4. Jangan menjanjikan kemitraan resmi dengan Kitabisa, BNPB, atau BPBD di dalam draf narasi.",
].join("\n");

export interface CampaignCandidatePromptItem {
  campaign_id: string;
  title: string;
  category: string;
  summary: string;
  beneficiary_area: string;
  campaign_url: string;
}

export interface DeterministicLogisticsPromptItem {
  item_code: string;
  item_name: string;
  quantity: number;
  unit: "paket" | "unit" | "buah" | "lembar" | "bibit" | "set" | "hari";
  unit_cost_idr: number | null;
  subtotal_idr: number | null;
  cost_source: string | null;
  assumption: string;
}

export interface CampaignMatcherPromptInput {
  hazardType:
    | "flood"
    | "coastal_flood"
    | "wildfire"
    | "mangrove_restoration"
    | "earthquake"
    | "other";
  affectedArea: string;
  severity: ImpactLevel;
  affectedPeopleEstimate: number | null;
  durationDays: number;
  candidates: CampaignCandidatePromptItem[];
  deterministicLogistics: DeterministicLogisticsPromptItem[];
}

export function buildCampaignMatcherPrompt(
  input: CampaignMatcherPromptInput,
): string {
  return [
    "Cocokkan konteks bencana berikut dengan kandidat kampanye terverifikasi dan susun draf narasi penggalangan dana:",
    JSON.stringify(
      {
        disaster_context: {
          hazard_type: input.hazardType,
          affected_area: input.affectedArea,
          severity: input.severity,
          affected_people_estimate: input.affectedPeopleEstimate,
          duration_days: input.durationDays,
        },
        closed_candidate_campaigns: input.candidates,
        deterministic_logistics: input.deterministicLogistics,
      },
      null,
      2,
    ),
  ].join("\n\n");
}