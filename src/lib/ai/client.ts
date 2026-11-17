// src/lib/ai/client.ts
import "server-only";
import { GoogleGenAI } from "@google/genai";
import { envConfig, hasGeminiConfig } from "@/lib/env-config";
import { ApiError } from "@/lib/api/errors";

let cachedClient: GoogleGenAI | null = null;

/**
 * Mengembalikan instance singleton GoogleGenAI untuk pemanggilan server-side.
 * Melempar ApiError jika GEMINI_API_KEY belum dikonfigurasi.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!hasGeminiConfig()) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "GEMINI_API_KEY belum dikonfigurasi pada server environment",
      { status: 503 },
    );
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: envConfig.gemini.apiKey });
  }

  return cachedClient;
}