// src/app/api/simulations/[scenarioCode]/route.ts
import { handleGetSimulationByCode } from "@/controllers/simulations.controller";
import { apiError, apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ scenarioCode: string }> },
) {
  try {
    const { scenarioCode } = await context.params;
    const data = await handleGetSimulationByCode(scenarioCode);

    return apiSuccess(data, {
      status: "SIMULATION",
      source: "INTERNAL_RULE",
      fetchedAt: data.scenario.conditions.fetchedAt,
      sourceUpdatedAt: data.scenario.conditions.sourceUpdatedAt,
      freshness: "FRESH",
      dataMode: "simulation",
      scenarioCode: data.scenario.code,
    });
  } catch (error) {
    return apiError(error, "Skenario simulasi tidak dapat dimuat");
  }
}