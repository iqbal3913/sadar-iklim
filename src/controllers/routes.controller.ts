// src/controllers/routes.controller.ts
import "server-only";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { liveShelters } from "@/lib/mock/live";
import { getScenario, scenarios } from "@/lib/mock/scenarios";
import {
  getSupabaseAdminClient,
  recordAuditLog,
} from "@/lib/supabase/admin";
import { requireServerRole } from "@/lib/supabase/server";
import type {
  LatLng,
  RoadStatus,
  RouteCandidate,
  RouteSegment,
  Shelter,
} from "@/lib/types";

const DecideRouteSchema = z.object({
  routeId: z.string().trim().min(1, "ID rute wajib diisi"),
  decision: z.enum(["approved", "rejected"]).nullable(),
  reason: z.string().trim().max(400).optional(),
});

export interface TacticalRoutesPayload {
  routes: RouteCandidate[];
  shelters: Shelter[];
  officerDecisions: Record<string, "approved" | "rejected">;
  disclaimer: string;
}

const inMemoryRouteDecisions: Record<string, "approved" | "rejected"> = {};

/**
 * Mengevaluasi ulang keputusan rute kandidat secara deterministik berdasarkan status segmennya:
 * - Jika ada segmen `BLOCKED`, rute tidak boleh berstatus `recommended` (diubah ke `not_recommended` atau `caution`).
 * - Jika ada segmen `CAUTION` atau `UNKNOWN`, rute ditandai `caution` dan diberi peringatan.
 * - `requiresOfficerApproval` selalu dipaksa `true` (PRD Bab 4.4.2 & 5.4).
 */
export function evaluateRouteCandidateSafety(
  route: RouteCandidate,
): RouteCandidate {
  let blockedCount = 0;
  let cautionOrUnknownCount = 0;

  for (const seg of route.segments) {
    if (seg.status === "BLOCKED") {
      blockedCount += 1;
    } else if (seg.status === "CAUTION" || seg.status === "UNKNOWN") {
      cautionOrUnknownCount += 1;
    }
  }

  const affectedSegments = blockedCount + cautionOrUnknownCount;
  let decision: RouteCandidate["decision"] = route.decision;

  if (blockedCount > 0 && decision === "recommended") {
    decision = "caution";
  } else if (cautionOrUnknownCount > 0 && decision === "recommended") {
    decision = "caution";
  }

  return {
    ...route,
    affectedSegments,
    decision,
    requiresOfficerApproval: true,
  };
}

function buildDefaultLiveRoutes(): RouteCandidate[] {
  const fallbackRob = getScenario("ROB-URBAN-01") ?? scenarios[0];
  const nowIso = new Date().toISOString();

  return fallbackRob.routes.map((r) =>
    evaluateRouteCandidateSafety({
      ...r,
      computedAt: nowIso,
      segments: r.segments.map((s): RouteSegment => {
        // Pada mode Live default tanpa penutupan jalan terkonfirmasi petugas, segmen BLOCKED simulasi diubah ke CAUTION
        const liveStatus: RoadStatus =
          s.status === "BLOCKED" ? "CAUTION" : s.status;
        return {
          positions: s.positions as LatLng[],
          status: liveStatus,
          note:
            s.status === "BLOCKED"
              ? "Perlu pemeriksaan petugas lapangan"
              : s.note,
        };
      }),
    }),
  );
}

/**
 * Mengambil kandidat rute evakuasi taktis dan daftar shelter berdasarkan mode (`live` atau `simulation`).
 */
export async function handleGetTacticalRoutes(options?: {
  mode?: string | null;
  scenarioCode?: string | null;
}): Promise<TacticalRoutesPayload> {
  const isSim = (options?.mode ?? "live").toLowerCase() === "simulation";

  if (isSim) {
    const scenario =
      getScenario(options?.scenarioCode || "ROB-URBAN-01") ?? scenarios[0];
    return {
      routes: scenario.routes.map(evaluateRouteCandidateSafety),
      shelters: scenario.shelters,
      officerDecisions: { ...inMemoryRouteDecisions },
      disclaimer:
        "Kandidat rute dihitung dari graph jalan deterministik, bukan AI. Semua rute evakuasi memerlukan persetujuan petugas BPBD",
    };
  }

  const admin = getSupabaseAdminClient();
  let shelters: Shelter[] = liveShelters;

  if (admin) {
    try {
      const { data: shelterRows } = await admin
        .from("evacuation_shelters")
        .select("*")
        .limit(50);

      if (shelterRows && shelterRows.length > 0) {
        shelters = shelterRows.map((row) => {
          const r = row as Record<string, unknown>;
          const rawAvail = String(r.availability_status ?? "unknown");
          const availability: Shelter["availability"] =
            rawAvail === "available" ||
            rawAvail === "limited" ||
            rawAvail === "full" ||
            rawAvail === "closed"
              ? rawAvail
              : "unknown";

          return {
            id: String(r.id),
            name: String(r.name ?? "Shelter Evakuasi"),
            position: liveShelters[0]?.position ?? [-3.8051, 102.2917],
            capacity: typeof r.capacity === "number" ? r.capacity : null,
            availability,
            verifiedAt: r.last_verified_at ? String(r.last_verified_at) : null,
          };
        });
      }
    } catch {
      shelters = liveShelters;
    }
  }

  return {
    routes: buildDefaultLiveRoutes(),
    shelters,
    officerDecisions: { ...inMemoryRouteDecisions },
    disclaimer:
      "Kandidat rute dihitung dari graph jalan deterministik, bukan AI. Semua rute evakuasi memerlukan persetujuan petugas BPBD",
  };
}

/**
 * Mencatat keputusan Petugas BPBD (`approved` / `rejected` / pembatalan `null`) untuk kandidat rute evakuasi
 * ke dalam jejak audit `public.audit_logs` (PRD Bab 4.4.2).
 */
export async function handleDecideTacticalRoute(
  request: Request,
  rawBody: unknown,
): Promise<{
  routeId: string;
  decision: "approved" | "rejected" | null;
  decidedAt: string;
  decidedBy: string;
}> {
  const officer = await requireServerRole(request, [
    "bpbd_admin",
    "super_admin",
  ]);
  const parsed = DecideRouteSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      parsed.error.issues[0]?.message ?? "Parameter keputusan rute tidak valid",
    );
  }

  const { routeId, decision, reason } = parsed.data;
  const decidedAt = new Date().toISOString();
  const prevDecision = inMemoryRouteDecisions[routeId] ?? null;

  if (decision === null) {
    delete inMemoryRouteDecisions[routeId];
  } else {
    inMemoryRouteDecisions[routeId] = decision;
  }

  void recordAuditLog({
    actorId: officer.isDemoAccount ? null : officer.id,
    actorRole: officer.role,
    action: decision
      ? `ROUTE_${decision.toUpperCase()}`
      : "ROUTE_DECISION_REVOKED",
    entityType: "route_candidates",
    entityId: routeId,
    beforeState: { decision: prevDecision },
    afterState: { decision, decidedAt },
    reason: reason ?? null,
  });

  return {
    routeId,
    decision,
    decidedAt,
    decidedBy: officer.displayName,
  };
}