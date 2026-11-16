// src/app/api/mangrove/route.ts
import {
  handleCreateMangroveAudit,
  handleListMangroveAudits,
  handleReviewMangroveAudit,
} from "@/controllers/mangrove.controller";
import { apiError, apiSuccess, enforceRateLimit } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const plotCode = new URL(request.url).searchParams.get("plotCode");
  try {
    const audits = await handleListMangroveAudits({ plotCode });
    return apiSuccess(audits, {
      status: "LIVE",
      source: "CITIZEN_REPORT",
      freshness: "FRESH",
    });
  } catch (error) {
    return apiError(error, "Daftar audit mangrove tidak dapat dimuat");
  }
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "mangrove_submit");
    const body: unknown = await request.json().catch(() => ({}));
    const created = await handleCreateMangroveAudit(request, body);

    return apiSuccess(
      created,
      {
        status: "LIVE",
        source: "CITIZEN_REPORT",
        freshness: "FRESH",
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error, "Audit mangrove gagal disimpan");
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const reviewed = await handleReviewMangroveAudit(request, body);

    return apiSuccess(reviewed, {
      status: "OK",
      source: "CITIZEN_REPORT",
      freshness: "FRESH",
    });
  } catch (error) {
    return apiError(error, "Status verifikasi audit mangrove gagal diperbarui");
  }
}