// src/app/api/vision/mangrove/route.ts
import { handleAnalyzeVision } from "@/controllers/vision.controller";
import { apiError, apiSuccess, enforceRateLimit } from "@/lib/api";
import { getServerActor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await getServerActor(request).catch(() => null);
    enforceRateLimit(request, "vision_ai", actor?.id);

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const output = await handleAnalyzeVision(
      {
        ...body,
        expectedMode: "mangrove_audit",
      },
      actor?.id ?? null,
    );

    return apiSuccess(output, {
      status: output.aiGenerated ? "LIVE" : "SIMULATION",
      source: "CITIZEN_REPORT",
      freshness: "FRESH",
      dataMode: output.aiGenerated ? "live" : "simulation",
    });
  } catch (error) {
    return apiError(error, "Analisis foto mangrove gagal diproses");
  }
}