// src/app/api/reports/route.ts
import {
  handleCreateReport,
  handleListReports,
} from "@/controllers/reports.controller";
import { apiError, apiSuccess, enforceRateLimit } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const scenarioCode = url.searchParams.get("scenario");
  const status = url.searchParams.get("status");

  try {
    const reports = await handleListReports({ mode, scenarioCode, status });
    const isSim = (mode ?? "live").toLowerCase() === "simulation";

    return apiSuccess(reports, {
      status: isSim ? "SIMULATION" : "LIVE",
      source: "CITIZEN_REPORT",
      freshness: "FRESH",
      dataMode: isSim ? "simulation" : "live",
      scenarioCode: isSim ? (scenarioCode ?? "ROB-URBAN-01") : null,
    });
  } catch (error) {
    return apiError(error, "Daftar laporan warga tidak dapat dimuat");
  }
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "report_submit");
    const body: unknown = await request.json().catch(() => ({}));
    const created = await handleCreateReport(request, body);

    return apiSuccess(
      created,
      {
        status:
          created.report.dataMode === "simulation" ? "SIMULATION" : "LIVE",
        source: "CITIZEN_REPORT",
        freshness: "FRESH",
        dataMode: created.report.dataMode,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error, "Laporan baru gagal disimpan");
  }
}