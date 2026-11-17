// src/app/api/simulations/route.ts
import {
  handleListSimulations,
  handleResetSimulationDemo,
} from "@/controllers/simulations.controller";
import { apiError, apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await handleListSimulations();
    return apiSuccess(data, {
      status: "SIMULATION",
      source: "INTERNAL_RULE",
      freshness: "FRESH",
      dataMode: "simulation",
    });
  } catch (error) {
    return apiError(error, "Daftar skenario simulasi tidak dapat dimuat");
  }
}

export async function POST(request: Request) {
  try {
    const result = await handleResetSimulationDemo(request);
    return apiSuccess(result, {
      status: "OK",
      source: "INTERNAL_RULE",
      freshness: "FRESH",
      dataMode: "simulation",
    });
  } catch (error) {
    return apiError(error, "Gagal mereset data demo simulasi");
  }
}