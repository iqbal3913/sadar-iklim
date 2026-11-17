// src/lib/supabase/admin.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { envConfig, hasSupabaseAdminConfig } from "@/lib/env-config";
import type { FreshnessStatus } from "@/lib/api/response";

let adminClient: SupabaseClient | null = null;

/**
 * Mengembalikan Supabase Admin Client (service_role) khusus untuk operasi server-side
 * yang sudah melewati pemeriksaan otorisasi eksplisit.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(
      envConfig.supabase.url,
      envConfig.supabase.serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return adminClient;
}

export interface RecordAiRunInput {
  featureKey: string;
  actorId?: string | null;
  modelId: string;
  promptVersion: string;
  schemaVersion: string;
  inputHash: string;
  status: "succeeded" | "failed" | "rejected_by_guard";
  latencyMs?: number | null;
  errorCode?: string | null;
}

/**
 * Mencatat metadata eksekusi AI ke tabel `public.ai_analysis_runs` secara non-blocking.
 */
export async function recordAiAnalysisRun(
  input: RecordAiRunInput,
): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  try {
    await admin.from("ai_analysis_runs").insert({
      feature_key: input.featureKey,
      actor_id: input.actorId ?? null,
      model_id: input.modelId,
      prompt_version: input.promptVersion,
      schema_version: input.schemaVersion,
      input_hash: input.inputHash,
      status: input.status,
      latency_ms: input.latencyMs ?? null,
      error_code: input.errorCode ?? null,
    });
  } catch {
    // Jangan gagalkan respons utama jika pencatatan telemetri AI gagal
  }
}

export interface RecordSourceSnapshotInput {
  provider: string;
  sourceUrl: string;
  regionKey?: string | null;
  fetchedAt: string;
  sourceUpdatedAt?: string | null;
  freshness: FreshnessStatus;
  checksum?: string | null;
}

/**
 * Mencatat metadata pengambilan data eksternal ke tabel `public.source_snapshots`.
 */
export async function recordSourceSnapshot(
  input: RecordSourceSnapshotInput,
): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  try {
    await admin.from("source_snapshots").insert({
      provider: input.provider,
      source_url: input.sourceUrl,
      region_key: input.regionKey ?? null,
      fetched_at: input.fetchedAt,
      source_updated_at: input.sourceUpdatedAt ?? input.fetchedAt,
      freshness: input.freshness,
      checksum: input.checksum ?? null,
    });
  } catch {
    // Non-blocking snapshot log
  }
}

export interface RecordAuditLogInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Mencatat jejak audit keputusan petugas/admin ke tabel `public.audit_logs`.
 */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  try {
    await admin.from("audit_logs").insert({
      actor_id: input.actorId ?? null,
      actor_role: input.actorRole ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_state: input.beforeState ?? null,
      after_state: input.afterState ?? null,
      reason: input.reason ?? null,
    });
  } catch {
    // Non-blocking audit log
  }
}