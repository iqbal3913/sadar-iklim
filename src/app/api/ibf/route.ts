// src/app/api/ibf/route.ts
import { handleGetIBFBulletin } from "@/controllers/ibf.controller";
import { apiError, apiSuccess, enforceRateLimit } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adm4 = url.searchParams.get("adm4");
  const mode = url.searchParams.get("mode");
  const scenarioCode = url.searchParams.get("scenario");
  const useAiParam = url.searchParams.get("ai");
  const useAi = useAiParam !== "false" && useAiParam !== "0";

  try {
    if (useAi && mode?.toUpperCase() !== "SIMULATION" && !scenarioCode) {
      enforceRateLimit(request, "ibf_ai");
    }

    const result = await handleGetIBFBulletin({
      adm4,
      mode,
      scenarioCode,
      useAi,
    });

    return apiSuccess(result.data, {
      status: result.status,
      source: result.status === "SIMULATION" ? "INTERNAL_RULE" : "BMKG",
      fetchedAt: result.fetchedAt,
      sourceUpdatedAt: result.sourceUpdatedAt,
      freshness: result.freshness,
      dataMode: result.status === "SIMULATION" ? "simulation" : "live",
      scenarioCode:
        result.status === "SIMULATION"
          ? (scenarioCode ?? "ROB-URBAN-01")
          : null,
    });
  } catch (error) {
    return apiError(error, "Buletin dampak IBF tidak dapat dimuat");
  }
}