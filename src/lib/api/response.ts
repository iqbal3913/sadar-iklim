// src/lib/api/response.ts
import { NextResponse } from "next/server";
import type { DataMode, SourceName } from "@/lib/types";
import { type ApiErrorCode, classifyUpstreamError, isApiError } from "./errors";

export type FreshnessStatus = "FRESH" | "STALE" | "ERROR";

export interface ApiProvenanceMeta {
  status?: DataMode | "OK";
  source?: SourceName | string;
  fetchedAt?: string;
  sourceUpdatedAt?: string | null;
  freshness?: FreshnessStatus;
  dataMode?: "live" | "simulation";
  scenarioCode?: string | null;
}

export interface ApiSuccessEnvelope<T> {
  status: DataMode | "OK";
  source?: SourceName | string;
  fetchedAt: string;
  fetched_at: string;
  sourceUpdatedAt: string | null;
  source_updated_at: string | null;
  freshness: FreshnessStatus;
  dataMode: "live" | "simulation";
  data_mode: "live" | "simulation";
  scenarioCode?: string | null;
  data: T;
}

export interface ApiErrorEnvelope {
  status: "ERROR";
  code: ApiErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
}

export function apiSuccess<T>(
  data: T,
  meta?: ApiProvenanceMeta,
  init?: ResponseInit,
): NextResponse<ApiSuccessEnvelope<T>> {
  const nowIso = new Date().toISOString();
  const fetchedAt = meta?.fetchedAt ?? nowIso;
  const sourceUpdatedAt = meta?.sourceUpdatedAt ?? fetchedAt;
  const status = meta?.status ?? "LIVE";
  const freshness: FreshnessStatus =
    meta?.freshness ?? (status === "STALE" ? "STALE" : "FRESH");
  const dataMode: "live" | "simulation" =
    meta?.dataMode ?? (status === "SIMULATION" ? "simulation" : "live");

  return NextResponse.json(
    {
      status,
      ...(meta?.source ? { source: meta.source } : {}),
      fetchedAt,
      fetched_at: fetchedAt,
      sourceUpdatedAt,
      source_updated_at: sourceUpdatedAt,
      freshness,
      dataMode,
      data_mode: dataMode,
      ...(meta?.scenarioCode !== undefined
        ? { scenarioCode: meta.scenarioCode }
        : {}),
      data,
    },
    { status: init?.status ?? 200, headers: init?.headers },
  );
}

export function apiError(
  error: unknown,
  fallbackMessage = "Terjadi kesalahan pada server",
  defaultStatus?: number,
): NextResponse<ApiErrorEnvelope> {
  const resolved = isApiError(error)
    ? error
    : classifyUpstreamError(error, fallbackMessage);

  const httpStatus = defaultStatus ?? resolved.status;

  return NextResponse.json(
    {
      status: "ERROR",
      code: resolved.code,
      message: resolved.message || fallbackMessage,
      ...(resolved.details !== undefined ? { details: resolved.details } : {}),
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus },
  );
}