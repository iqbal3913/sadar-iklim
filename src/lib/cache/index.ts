// src/lib/cache/index.ts
import "server-only";
import { createHash } from "node:crypto";
import { classifyUpstreamError } from "@/lib/api/errors";

export interface CacheEntry<T> {
  key: string;
  provider: string;
  data: T;
  fetchedAt: string;
  sourceUpdatedAt: string;
  expiresAt: string;
  storedAtMs: number;
  ttlMs: number;
  checksum: string;
}

export interface CachedLoadResult<T> {
  status: "LIVE" | "STALE";
  freshness: "FRESH" | "STALE";
  provider: string;
  fetchedAt: string;
  sourceUpdatedAt: string;
  expiresAt: string;
  checksum: string;
  data: T;
  staleReason?: string;
}

interface CircuitState {
  failures: number;
  openedAtMs: number | null;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const circuitBreakers = new Map<string, CircuitState>();

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 60 * 1000;

export const CACHE_TTL_MS = {
  BMKG_FORECAST: 30 * 60 * 1000,
  BMKG_CAP_FEED: 3 * 60 * 1000,
  BMKG_CAP_DETAIL: 3 * 60 * 1000,
  BMKG_EARTHQUAKE: 2 * 60 * 1000,
  OPEN_METEO_MARINE: 30 * 60 * 1000,
  NASA_FIRMS: 15 * 60 * 1000,
  INARISK_LAYER: 24 * 60 * 60 * 1000,
  FACILITIES: 7 * 24 * 60 * 60 * 1000,
  KITABISA_CATALOG: 12 * 60 * 60 * 1000,
} as const;

export function buildSourceCacheKey(
  provider: string,
  regionOrScope: string,
): string {
  const cleanProvider = provider.trim().toUpperCase();
  const cleanScope = regionOrScope.trim().toLowerCase();
  return `${cleanProvider}:${cleanScope}`;
}

function computePayloadChecksum(data: unknown): string {
  const serialized = typeof data === "string" ? data : JSON.stringify(data);
  return createHash("sha256").update(serialized).digest("hex").slice(0, 32);
}

function isCircuitOpen(provider: string): boolean {
  const state = circuitBreakers.get(provider);
  if (!state || state.openedAtMs === null) return false;
  if (Date.now() - state.openedAtMs >= CIRCUIT_COOLDOWN_MS) {
    circuitBreakers.set(provider, { failures: 0, openedAtMs: null });
    return false;
  }
  return true;
}

function recordProviderSuccess(provider: string): void {
  circuitBreakers.set(provider, { failures: 0, openedAtMs: null });
}

function recordProviderFailure(provider: string): void {
  const prev = circuitBreakers.get(provider) ?? {
    failures: 0,
    openedAtMs: null,
  };
  const failures = prev.failures + 1;
  circuitBreakers.set(provider, {
    failures,
    openedAtMs:
      failures >= CIRCUIT_FAILURE_THRESHOLD ? Date.now() : prev.openedAtMs,
  });
}

export async function withSourceCache<T>(options: {
  key: string;
  provider: string;
  ttlMs: number;
  loader: (fetchedAtIso: string) => Promise<{
    data: T;
    sourceUpdatedAt?: string | null;
  }>;
}): Promise<CachedLoadResult<T>> {
  const nowMs = Date.now();
  const existing = memoryCache.get(options.key) as CacheEntry<T> | undefined;

  if (existing && nowMs - existing.storedAtMs < options.ttlMs) {
    return {
      status: "LIVE",
      freshness: "FRESH",
      provider: options.provider,
      fetchedAt: existing.fetchedAt,
      sourceUpdatedAt: existing.sourceUpdatedAt,
      expiresAt: existing.expiresAt,
      checksum: existing.checksum,
      data: existing.data,
    };
  }

  if (isCircuitOpen(options.provider) && existing) {
    return {
      status: "STALE",
      freshness: "STALE",
      provider: options.provider,
      fetchedAt: existing.fetchedAt,
      sourceUpdatedAt: existing.sourceUpdatedAt,
      expiresAt: existing.expiresAt,
      checksum: existing.checksum,
      data: existing.data,
      staleReason: `Circuit breaker aktif untuk provider ${options.provider}`,
    };
  }

  try {
    const fetchedAt = new Date(nowMs).toISOString();
    const loaded = await options.loader(fetchedAt);
    const sourceUpdatedAt = loaded.sourceUpdatedAt ?? fetchedAt;
    const expiresAt = new Date(nowMs + options.ttlMs).toISOString();
    const checksum = computePayloadChecksum(loaded.data);

    const entry: CacheEntry<T> = {
      key: options.key,
      provider: options.provider,
      data: loaded.data,
      fetchedAt,
      sourceUpdatedAt,
      expiresAt,
      storedAtMs: nowMs,
      ttlMs: options.ttlMs,
      checksum,
    };

    memoryCache.set(options.key, entry);
    recordProviderSuccess(options.provider);

    return {
      status: "LIVE",
      freshness: "FRESH",
      provider: options.provider,
      fetchedAt,
      sourceUpdatedAt,
      expiresAt,
      checksum,
      data: loaded.data,
    };
  } catch (error) {
    recordProviderFailure(options.provider);

    if (existing) {
      return {
        status: "STALE",
        freshness: "STALE",
        provider: options.provider,
        fetchedAt: existing.fetchedAt,
        sourceUpdatedAt: existing.sourceUpdatedAt,
        expiresAt: existing.expiresAt,
        checksum: existing.checksum,
        data: existing.data,
        staleReason:
          error instanceof Error
            ? error.message
            : `Gagal memperbarui data dari ${options.provider}`,
      };
    }

    throw classifyUpstreamError(
      error,
      `Sumber data ${options.provider} tidak dapat dijangkau`,
    );
  }
}

export function invalidateSourceCacheByPrefix(prefix: string): number {
  let removed = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
      removed += 1;
    }
  }
  return removed;
}