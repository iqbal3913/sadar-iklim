// src/app/api/bmkg/alerts/route.ts
import { handleGetWeatherAlerts } from "@/controllers/weather.controller";
import { apiError, apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const province = new URL(request.url).searchParams.get("province");
  try {
    const result = await handleGetWeatherAlerts(province);
    return apiSuccess(result.data, {
      status: result.status,
      source: "BMKG",
      fetchedAt: result.fetchedAt,
      sourceUpdatedAt: result.sourceUpdatedAt,
      freshness: result.freshness,
    });
  } catch (error) {
    return apiError(error, "Peringatan dini BMKG tidak dapat diambil");
  }
}