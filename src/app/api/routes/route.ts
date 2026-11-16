// src/app/api/routes/route.ts
import {
  handleDecideTacticalRoute,
  handleGetTacticalRoutes,
} from "@/controllers/routes.controller";
import { apiError, apiSuccess, enforceRateLimit } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const mode = sp.get("mode");
  const scenarioCode = sp.get("scenario");

  try {
    enforceRateLimit(request, "route_compute");
    const data = await handleGetTacticalRoutes({ mode, scenarioCode });
    const isSim = (mode ?? "live").toLowerCase() === "simulation";

    return apiSuccess(data, {
      status: isSim ? "SIMULATION" : "LIVE",
      source: "INTERNAL_RULE",
      freshness: "FRESH",
      dataMode: isSim ? "simulation" : "live",
    });
  } catch (error) {
    return apiError(error, "Kandidat rute evakuasi tidak dapat dihitung");
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const decision = await handleDecideTacticalRoute(request, body);

    return apiSuccess(decision, {
      status: "OK",
      source: "INTERNAL_RULE",
      freshness: "FRESH",
    });
  } catch (error) {
    return apiError(error, "Keputusan persetujuan rute gagal disimpan");
  }
}