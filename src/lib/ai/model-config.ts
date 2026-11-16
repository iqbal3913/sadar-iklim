// src/lib/ai/model-config.ts
import "server-only";
import { envConfig } from "@/lib/env-config";

export const AI_FEATURE_KEYS = {
  VISION_TRIAGE: "vision_triage",
  MANGROVE_VISION: "mangrove_vision",
  IBF_BULLETIN: "ibf_bulletin",
  CAMPAIGN_MATCHER: "campaign_matcher",
} as const;

export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[keyof typeof AI_FEATURE_KEYS];

export const PROMPT_VERSIONS: Record<AiFeatureKey, string> = {
  vision_triage: "vision-triage-v1.0",
  mangrove_vision: "mangrove-vision-v1.0",
  ibf_bulletin: "ibf-bulletin-v1.0",
  campaign_matcher: "campaign-matcher-v1.0",
};

export const SCHEMA_VERSIONS: Record<AiFeatureKey, string> = {
  vision_triage: "1.0.0",
  mangrove_vision: "1.0.0",
  ibf_bulletin: "1.0.0",
  campaign_matcher: "1.0.0",
};

export const ALLOWED_VISION_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedVisionMimeType = (typeof ALLOWED_VISION_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB sesuai PRD Bab 3.6 & 8.1.1

export function getActiveGeminiModel(): string {
  return envConfig.gemini.model;
}

export const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.1,
  maxOutputTokens: 4096,
  timeoutMs: 15000, // Target p95 <= 15 detik sesuai PRD Bab 8.1.1
} as const;