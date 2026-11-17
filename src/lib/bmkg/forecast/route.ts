// src/app/api/bmkg/forecast/route.ts
import { handleGetWeatherForecast } from "@/controllers/weather.controller";
import { apiError, apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const adm4 = new URL(request.url).searchParams.get("adm4");
  try {
    const result = await handleGetWeatherForecast(adm4);
    return apiSuccess(result.data, {
      status: result.status,
      source: "BMKG",
      fetchedAt: result.fetchedAt,
      sourceUpdatedAt: result.sourceUpdatedAt,
      freshness: result.freshness,
    });
  } catch (error) {
    return apiError(error, "Prakiraan BMKG tidak dapat diambil");
  }
}