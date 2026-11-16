// src/app/api/bmkg/earthquakes/route.ts
import { handleGetEarthquakes } from "@/controllers/weather.controller";
import { apiError, apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await handleGetEarthquakes();
    return apiSuccess(result.data, {
      status: result.status,
      source: "BMKG",
      fetchedAt: result.fetchedAt,
      sourceUpdatedAt: result.sourceUpdatedAt,
      freshness: result.freshness,
    });
  } catch (error) {
    return apiError(error, "Data gempa BMKG tidak dapat diambil");
  }
}