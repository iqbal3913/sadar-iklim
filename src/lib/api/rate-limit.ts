// src/lib/api/rate-limit.ts
import "server-only";
import { createHash } from "node:crypto";
import { ApiError } from "./errors";

export type RateLimitBucket =
  | "vision_ai"
  | "ibf_ai"
  | "campaign_ai"
  | "report_submit"
  | "mangrove_submit"
  | "route_compute";

interface BucketConfig {
  maxRequests: number;
  windowMs: number;
}

const BUCKET_LIMITS: Record<RateLimitBucket, BucketConfig> = {
  vision_ai: { maxRequests: 15, windowMs: 5 * 60 * 1000 }, // 15 req / 5 menit
  ibf_ai: { maxRequests: 20, windowMs: 5 * 60 * 1000 }, // 20 req / 5 menit
  campaign_ai: { maxRequests: 20, windowMs: 5 * 60 * 1000 }, // 20 req / 5 menit
  report_submit: { maxRequests: 10, windowMs: 5 * 60 * 1000 }, // 10 laporan / 5 menit
  mangrove_submit: { maxRequests: 10, windowMs: 5 * 60 * 1000 }, // 10 audit / 5 menit
  route_compute: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 rute / menit
};

const requestWindows = new Map<string, { count: number; resetAtMs: number }>();

/**
 * Mengambil hash anonim dari IP pengirim tanpa menyimpan IP mentah di memori.
 */
export function getHashedClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const firstIp = forwarded.split(",")[0]?.trim() || "local-client";
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 80);
  return createHash("sha256")
    .update(`${firstIp}:${userAgent}`)
    .digest("hex")
    .slice(0, 24);
}

/**
 * Memeriksa batas laju permintaan untuk mencegah penyalahgunaan kuota API/AI.
 * Melempar ApiError("UPSTREAM_RATE_LIMIT") dengan HTTP 429 jika melebihi kuota.
 */
export function enforceRateLimit(
  request: Request,
  bucket: RateLimitBucket,
  actorId?: string | null,
): void {
  const config = BUCKET_LIMITS[bucket];
  const identifier = actorId || getHashedClientIdentifier(request);
  const key = `${bucket}:${identifier}`;
  const now = Date.now();

  const current = requestWindows.get(key);
  if (!current || now >= current.resetAtMs) {
    requestWindows.set(key, { count: 1, resetAtMs: now + config.windowMs });
    return;
  }

  if (current.count >= config.maxRequests) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((current.resetAtMs - now) / 1000),
    );
    throw new ApiError(
      "UPSTREAM_RATE_LIMIT",
      `Batas permintaan terlampaui. Silakan coba kembali dalam ${retryAfterSec} detik`,
      { status: 429, details: { bucket, retryAfterSec } },
    );
  }

  current.count += 1;
}