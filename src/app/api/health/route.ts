// src/app/api/health/route.ts
import { getActiveGeminiModel } from "@/lib/ai";
import { apiError, apiSuccess } from "@/lib/api";
import {
  envConfig,
  hasFirmsConfig,
  hasGeminiConfig,
  hasSupabaseAdminConfig,
  hasSupabaseConfig,
} from "@/lib/env-config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startMs = Date.now();
    let databaseStatus: "connected" | "not_configured" | "degraded" =
      "not_configured";

    if (hasSupabaseAdminConfig()) {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const { error } = await admin
          .from("simulation_scenarios")
          .select("scenario_code")
          .limit(1);
        databaseStatus = error ? "degraded" : "connected";
      }
    }

    const latencyMs = Date.now() - startMs;

    return apiSuccess(
      {
        service: "sadariklim-backend",
        version: "1.0.0",
        uptimeCheckAt: new Date().toISOString(),
        latencyMs,
        defaultAdm4: envConfig.bmkgAdm4,
        dependencies: {
          supabaseClient: hasSupabaseConfig() ? "configured" : "fallback_mock",
          supabaseDatabase: databaseStatus,
          geminiAi: {
            configured: hasGeminiConfig(),
            activeModel: getActiveGeminiModel(),
          },
          nasaFirms: hasFirmsConfig() ? "configured" : "simulation_only",
          bmkgOpenData: "enabled",
          openMeteoMarine: "enabled",
        },
      },
      {
        status: "OK",
        source: "INTERNAL_RULE",
        freshness: databaseStatus === "degraded" ? "STALE" : "FRESH",
      },
    );
  } catch (error) {
    return apiError(error, "Pemeriksaan kesehatan layanan gagal");
  }
}