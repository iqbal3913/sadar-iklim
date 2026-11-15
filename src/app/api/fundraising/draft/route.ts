// src/app/api/fundraising/draft/route.ts
import {
  type MatchCampaignRequestInput,
  handleMatchCampaignsAndLogistics,
} from "@/controllers/campaigns.controller";
import { apiError, apiSuccess, enforceRateLimit } from "@/lib/api";
import { getServerActor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await getServerActor(request).catch(() => null);
    enforceRateLimit(request, "campaign_ai", actor?.id);

    const body = (await request.json().catch(() => ({}))) as MatchCampaignRequestInput;
    const result = await handleMatchCampaignsAndLogistics(
      body,
      actor?.id ?? null,
    );

    return apiSuccess(
      {
        disasterContext: result.matcher.disaster_context,
        logisticsEstimate: result.matcher.logistics_estimate,
        totalEstimatedCostIdr: result.matcher.total_estimated_cost_idr,
        fundraisingDraft: result.matcher.fundraising_draft,
        assumptions: result.matcher.assumptions,
        warnings: result.matcher.warnings,
        humanApprovalRequired: result.matcher.human_approval_required,
        aiGenerated: result.aiGenerated,
      },
      {
        status: "LIVE",
        source: "INTERNAL_RULE",
        freshness: "FRESH",
      },
    );
  } catch (error) {
    return apiError(error, "Draf penggalangan dana dan logistik gagal dibuat");
  }
}