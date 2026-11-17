// src/app/api/reports/[id]/review/route.ts
import {
  handleDeleteReport,
  handleReviewReport,
} from "@/controllers/reports.controller";
import { apiError, apiSuccess } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => ({}));
    const reviewed = await handleReviewReport(request, id, body);

    return apiSuccess(reviewed, {
      status: "OK",
      source: "CITIZEN_REPORT",
      freshness: "FRESH",
    });
  } catch (error) {
    return apiError(error, "Keputusan verifikasi laporan gagal disimpan");
  }
}

export const PATCH = POST;

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const deleted = await handleDeleteReport(request, id);

    return apiSuccess(deleted, {
      status: "OK",
      source: "CITIZEN_REPORT",
      freshness: "FRESH",
    });
  } catch (error) {
    return apiError(error, "Laporan gagal dihapus atau ditarik");
  }
}