// src/lib/ai/generate-structured.ts
import "server-only";
import { createHash } from "node:crypto";
import type { GenerateContentConfig } from "@google/genai";
import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ApiError, classifyUpstreamError } from "@/lib/api/errors";
import { getGeminiClient } from "./client";
import {
  type AiFeatureKey,
   type AllowedVisionMimeType,
  DEFAULT_GENERATION_CONFIG,
  PROMPT_VERSIONS,
  SCHEMA_VERSIONS,
  getActiveGeminiModel,
} from "./model-config";

export interface StructuredImageInput {
  mimeType: AllowedVisionMimeType;
  base64: string;
}

export interface GenerateStructuredArgs<T> {
  featureKey?: AiFeatureKey;
  schema: ZodType<T>;
  prompt: string;
  systemInstruction?: string;
  image?: StructuredImageInput;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface GenerateStructuredMetadata {
  modelId: string;
  promptVersion: string;
  schemaVersion: string;
  inputHash: string;
  latencyMs: number;
}

export interface GenerateStructuredResult<T> {
  data: T;
  meta: GenerateStructuredMetadata;
}

/**
 * Membersihkan prefix data:image/...;base64, jika ada, sehingga inlineData.data
 * hanya berisi raw base64 sesuai ketentuan PRD Bab 5.6.
 */
export function stripBase64DataUrlPrefix(rawBase64: string): string {
  const trimmed = rawBase64.trim();
  const commaIdx = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && commaIdx !== -1) {
    return trimmed.slice(commaIdx + 1).trim();
  }
  return trimmed;
}

/**
 * Menghapus properti JSON Schema seperti `$schema` dan `additionalProperties`
 * yang tidak didukung oleh validator OpenAPI 3 `responseSchema` pada Gemini API,
 * sementara validasi `.strict()` tetap ditegakkan oleh `schema.safeParse()` di server.
 */
function sanitizeOpenApiSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeOpenApiSchema);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      if (k === "$schema" || k === "additionalProperties") {
        continue;
      }
      cleaned[k] = sanitizeOpenApiSchema(v);
    }
    return cleaned;
  }
  return value;
}

function computeInputHash(prompt: string, imageBase64?: string): string {
  const hash = createHash("sha256");
  hash.update(prompt);
  if (imageBase64) {
    hash.update(imageBase64.slice(0, 1024));
    hash.update(String(imageBase64.length));
  }
  return hash.digest("hex");
}

/**
 * Memanggil Gemini dengan `responseMimeType: "application/json"` dan `responseSchema`
 * yang diturunkan dari Zod, lalu memvalidasi ulang respons menggunakan `schema.safeParse()`.
 */
export async function generateStructuredWithMeta<T>(
  args: GenerateStructuredArgs<T>,
): Promise<GenerateStructuredResult<T>> {
  const ai = getGeminiClient();
  const modelId = getActiveGeminiModel();
  const featureKey = args.featureKey ?? "ibf_bulletin";
  const promptVersion = PROMPT_VERSIONS[featureKey];
  const schemaVersion = SCHEMA_VERSIONS[featureKey];

  const rawJsonSchema = zodToJsonSchema(args.schema, {
    target: "openApi3",
    $refStrategy: "none",
  });
  const responseSchema = sanitizeOpenApiSchema(
    rawJsonSchema,
  ) as NonNullable<GenerateContentConfig["responseSchema"]>;

  const cleanBase64 = args.image
    ? stripBase64DataUrlPrefix(args.image.base64)
    : undefined;

  const inputHash = computeInputHash(args.prompt, cleanBase64);

  const parts = [
    { text: args.prompt },
    ...(args.image && cleanBase64
      ? [
          {
            inlineData: {
              mimeType: args.image.mimeType,
              data: cleanBase64,
            },
          },
        ]
      : []),
  ];

  const startMs = Date.now();
  let rawText: string | undefined;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts }],
      config: {
        temperature: args.temperature ?? DEFAULT_GENERATION_CONFIG.temperature,
        maxOutputTokens:
          args.maxOutputTokens ?? DEFAULT_GENERATION_CONFIG.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema,
        ...(args.systemInstruction
          ? { systemInstruction: args.systemInstruction }
          : {}),
        abortSignal: AbortSignal.timeout(
          args.timeoutMs ?? DEFAULT_GENERATION_CONFIG.timeoutMs,
        ),
      },
    });
    rawText = response.text;
  } catch (error) {
    throw classifyUpstreamError(
      error,
      "Layanan analisis AI Gemini tidak dapat dijangkau saat ini",
    );
  }

  const latencyMs = Date.now() - startMs;

  if (!rawText) {
    throw new ApiError(
      "INVALID_SCHEMA",
      "Model AI mengembalikan respons kosong",
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new ApiError("INVALID_SCHEMA", "Respons AI bukan JSON valid");
  }

  const validated = args.schema.safeParse(parsedJson);
  if (!validated.success) {
    const issueSummary = validated.error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code,
    }));
    throw new ApiError(
      "INVALID_SCHEMA",
      `Respons AI gagal validasi schema: ${validated.error.issues.length} issue`,
      { details: issueSummary },
    );
  }

  return {
    data: validated.data,
    meta: {
      modelId,
      promptVersion,
      schemaVersion,
      inputHash,
      latencyMs,
    },
  };
}

/**
 * Wrapper kompatibel dengan contoh Bab 5.6 PRD yang langsung mengembalikan `T`.
 */
export async function generateStructured<T>(
  args: GenerateStructuredArgs<T>,
): Promise<T> {
  const result = await generateStructuredWithMeta(args);
  return result.data;
}