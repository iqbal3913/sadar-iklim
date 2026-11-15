// src/controllers/simulations.controller.ts
import "server-only";
import { ApiError } from "@/lib/api";
import {
  type Snapshot,
  getScenarioSnapshot,
  listSamplePhotos,
  listScenarios,
} from "@/lib/data";
import { getScenario } from "@/lib/mock/scenarios";
import {
  getSupabaseAdminClient,
  recordAuditLog,
} from "@/lib/supabase/admin";
import { getServerActor } from "@/lib/supabase/server";
import type { SamplePhoto, Scenario } from "@/lib/types";

export const SIMULATION_WATERMARK =
  "SIMULASI — BUKAN PERINGATAN RESMI" as const;

export interface SimulationCatalogPayload {
  watermark: typeof SIMULATION_WATERMARK;
  scenarios: Scenario[];
  samplePhotos: SamplePhoto[];
}

export interface SimulationDetailPayload {
  watermark: typeof SIMULATION_WATERMARK;
  scenario: Scenario;
  snapshot: Snapshot;
}

export interface SimulationResetPayload {
  resetAt: string;
  clearedSimulationReports: number;
  clearedSimulationAudits: number;
  message: string;
}

/**
 * Mengambil seluruh daftar skenario simulasi aktif beserta 5 sampel foto uji instan (PRD Bab 4.5.3 & 4.5.4).
 */
export async function handleListSimulations(): Promise<SimulationCatalogPayload> {
  const staticScenarios = listScenarios();
  const samplePhotos = listSamplePhotos();

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      watermark: SIMULATION_WATERMARK,
      scenarios: staticScenarios,
      samplePhotos,
    };
  }

  try {
    const { data: dbRows } = await admin
      .from("simulation_scenarios")
      .select("scenario_code, name, description, hazard_type, is_active")
      .eq("is_active", true);

    if (!dbRows || dbRows.length === 0) {
      return {
        watermark: SIMULATION_WATERMARK,
        scenarios: staticScenarios,
        samplePhotos,
      };
    }

    const dbByCode = new Map(
      dbRows.map((row) => [String(row.scenario_code), row]),
    );

    const merged = staticScenarios.map((sc) => {
      const override = dbByCode.get(sc.code);
      if (!override) return sc;
      return {
        ...sc,
        name: String(override.name || sc.name),
        description: String(override.description || sc.description),
      };
    });

    return {
      watermark: SIMULATION_WATERMARK,
      scenarios: merged,
      samplePhotos,
    };
  } catch {
    return {
      watermark: SIMULATION_WATERMARK,
      scenarios: staticScenarios,
      samplePhotos,
    };
  }
}

/**
 * Mengambil detail satu skenario simulasi berdasarkan `scenarioCode`
 * beserta objek `Snapshot` yang siap dipakai oleh komponen peta & dashboard.
 */
export async function handleGetSimulationByCode(
  rawCode: string,
): Promise<SimulationDetailPayload> {
  const code = rawCode.trim().toUpperCase();
  const scenario = getScenario(code);

  if (!scenario) {
    throw new ApiError(
      "NOT_FOUND",
      `Kode skenario simulasi "${code}" tidak ditemukan. Gunakan ROB-URBAN-01, KARHUTLA-GAMBUT-02, atau GEMPA-PESISIR-03`,
    );
  }

  const snapshot = getScenarioSnapshot(scenario.code);

  return {
    watermark: SIMULATION_WATERMARK,
    scenario,
    snapshot,
  };
}

/**
 * Mereset state simulasi di database (hanya baris dengan `data_mode = 'simulation'`)
 * tanpa menghapus atau mengubah data observasi/laporan `live` (PRD Bab 4.5.2).
 */
export async function handleResetSimulationDemo(
  request: Request,
): Promise<SimulationResetPayload> {
  const actor = await getServerActor(request).catch(() => null);
  const resetAt = new Date().toISOString();
  const admin = getSupabaseAdminClient();

  let clearedSimulationReports = 0;
  let clearedSimulationAudits = 0;

  if (admin) {
    try {
      const { data: deletedReports } = await admin
        .from("reports")
        .delete()
        .eq("data_mode", "simulation")
        .select("id");

      clearedSimulationReports = deletedReports?.length ?? 0;

      const { data: deletedAudits } = await admin
        .from("mangrove_audits")
        .delete()
        .eq("data_mode", "simulation")
        .select("id");

      clearedSimulationAudits = deletedAudits?.length ?? 0;
    } catch {
      // Tetap lanjutkan respons reset untuk state client bila tabel kosong/belum dimigrasi
    }
  }

  void recordAuditLog({
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? "anonymous_evaluator",
    action: "RESET_SIMULATION_DEMO",
    entityType: "simulation_scenarios",
    entityId: "ALL_SIMULATION_DATA",
    afterState: {
      clearedSimulationReports,
      clearedSimulationAudits,
      resetAt,
    },
    reason: "Reset demo dari Judge Mode",
  });

  return {
    resetAt,
    clearedSimulationReports,
    clearedSimulationAudits,
    message:
      "Data simulasi berhasil dikembalikan ke kondisi awal tanpa mengubah data live",
  };
}