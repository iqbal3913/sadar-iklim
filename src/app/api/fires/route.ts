// src/app/api/fires/route.ts
import { handleGetFiresIntelligence } from "@/controllers/fires.controller";
import { apiError, apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  try {
    const result = await handleGetFiresIntelligence({
      mode: sp.get("mode"),
      scenario: sp.get("scenario"),
      west: sp.get("west"),
      south: sp.get("south"),
      east: sp.get("east"),
      north: sp.get("north"),
      days: sp.get("days"),
      sensor: sp.get("sensor"),
      windFromDeg: sp.get("windFromDeg"),
      windSpeedMs: sp.get("windSpeedMs"),
    });

    return apiSuccess(result.data, {
      status: result.status,
      source: result.status === "SIMULATION" ? "INTERNAL_RULE" : "NASA_FIRMS",
      fetchedAt: result.fetchedAt,
      sourceUpdatedAt: result.sourceUpdatedAt,
      freshness: result.freshness,
      dataMode: result.status === "SIMULATION" ? "simulation" : "live",
    });
  } catch (error) {
    return apiError(error, "Data titik panas dan koridor asap gagal dimuat");
  }
}