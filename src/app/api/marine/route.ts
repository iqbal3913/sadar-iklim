// src/app/api/marine/route.ts
import { handleGetMarineForecast } from "@/controllers/weather.controller";
import { apiError, apiSuccess } from "@/lib/api";
import { LIVE_CENTER } from "@/lib/mock/live";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = params.get("lat") ?? String(LIVE_CENTER[0]);
  const lon = params.get("lon") ?? String(LIVE_CENTER[1]);

  try {
    const result = await handleGetMarineForecast({ lat, lon });
    return apiSuccess(result.data, {
      status: result.status,
      source: "OPEN_METEO",
      fetchedAt: result.fetchedAt,
      sourceUpdatedAt: result.sourceUpdatedAt,
      freshness: result.freshness,
    });
  } catch (error) {
    return apiError(error, "Data gelombang Open-Meteo Marine tidak dapat diambil");
  }
}