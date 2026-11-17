// src/app/api/facilities/route.ts
import {
  handleListFacilities,
  handleUpdateFacilityStatus,
} from "@/controllers/fires.controller";
import { apiError, apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const mode = sp.get("mode");
  const scenarioCode = sp.get("scenario");
  const adm4 = sp.get("adm4");

  try {
    const facilities = await handleListFacilities({ mode, scenarioCode, adm4 });
    const isSim = (mode ?? "live").toLowerCase() === "simulation";

    return apiSuccess(facilities, {
      status: isSim ? "SIMULATION" : "LIVE",
      source: "BNPB_INARISK",
      freshness: "FRESH",
      dataMode: isSim ? "simulation" : "live",
    });
  } catch (error) {
    return apiError(error, "Data fasilitas kritis tidak dapat dimuat");
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const updated = await handleUpdateFacilityStatus(request, body);

    return apiSuccess(updated, {
      status: "OK",
      source: "BNPB_INARISK",
      freshness: "FRESH",
    });
  } catch (error) {
    return apiError(error, "Status verifikasi fasilitas gagal diperbarui");
  }
}