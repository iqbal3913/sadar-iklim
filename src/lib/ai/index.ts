// src/lib/ai/index.ts
export { getGeminiClient } from "./client";
export {
  AI_FEATURE_KEYS,
  type AiFeatureKey,
  ALLOWED_VISION_MIME_TYPES,
  type AllowedVisionMimeType,
  DEFAULT_GENERATION_CONFIG,
  MAX_IMAGE_BYTES,
  PROMPT_VERSIONS,
  SCHEMA_VERSIONS,
  getActiveGeminiModel,
} from "./model-config";
export {
  type GenerateStructuredArgs,
  type GenerateStructuredMetadata,
  type GenerateStructuredResult,
  type StructuredImageInput,
  generateStructured,
  generateStructuredWithMeta,
  stripBase64DataUrlPrefix,
} from "./generate-structured";
export * from "./schemas";
export * from "./prompts";