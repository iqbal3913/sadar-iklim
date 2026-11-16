// FIle eksisting Template/Mock
/* import "server-only";

export const envConfig = {
  bmkgAdm4: process.env.BMKG_ADM4 || "31.71.03.1001",
}; */

// File Eksisting pembaruan
// src/lib/env-config.ts
import "server-only";

export const envConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  bmkgAdm4: process.env.BMKG_ADM4 || "31.71.03.1001",

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  },

  firms: {
    mapKey: process.env.FIRMS_MAP_KEY || "",
  },

  routing: {
    baseUrl: process.env.ROUTING_BASE_URL || "",
  },

  cronSecret: process.env.CRON_SECRET || "",
} as const;

export function hasSupabaseConfig(): boolean {
  return Boolean(envConfig.supabase.url && envConfig.supabase.anonKey);
}

export function hasSupabaseAdminConfig(): boolean {
  return Boolean(
    envConfig.supabase.url &&
      envConfig.supabase.anonKey &&
      envConfig.supabase.serviceRoleKey,
  );
}

export function hasGeminiConfig(): boolean {
  return Boolean(envConfig.gemini.apiKey);
}

export function hasFirmsConfig(): boolean {
  return Boolean(envConfig.firms.mapKey);
}