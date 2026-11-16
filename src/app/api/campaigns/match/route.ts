// src/app/api/campaigns/match/route.ts
import {
  type MatchCampaignRequestInput,
  handleMatchCampaignsAndLogistics,
} from "@/controllers/campaigns.controller";
import { apiError, apiSuccess, enforceRateLimit } from "@/lib/api";
import { getServerActor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  try {
    const result = await handleMatchCampaignsAndLogistics({
      hazardType:
        (sp.get("hazardType") as MatchCampaignRequestInput["hazardType"]) ??
        "coastal_flood",
      affectedArea: sp.get("area") ?? "Pasar Baru, Kota Bengkulu",
      severity:
        (sp.get("severity") as MatchCampaignRequestInput["severity"]) ?? "high",
      affectedPeopleEstimate: sp.get("people")
        ? Number(sp.get("people"))
        : 150,
      durationDays: sp.get("days") ? Number(sp.get("days")) : 3,
      useAi: sp.get("ai") === "true" || sp.get("ai") === "1",
    });

    return apiSuccess(result, {
      status: "LIVE",
      source: "INTERNAL_RULE",
      freshness: "FRESH",
    });
  } catch (error) {
    return apiError(error, "Pencocokan kampanye bantuan gagal dimuat");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getServerActor(request).catch(() => null);
    enforceRateLimit(request, "campaign_ai", actor?.id);

    const body = (await request.json().catch(() => ({}))) as MatchCampaignRequestInput;
    const result = await handleMatchCampaignsAndLogistics(
      body,
      actor?.id ?? null,
    );

    return apiSuccess(result, {
      status: "LIVE",
      source: "INTERNAL_RULE",
      freshness: "FRESH",
    });
  } catch (error) {
    return apiError(error, "Pencocokan kampanye bantuan gagal diproses");
  }
}