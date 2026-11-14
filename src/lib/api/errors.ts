// src/lib/api/errors.ts
export type ApiErrorCode =
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_RATE_LIMIT"
  | "INVALID_SCHEMA"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "STALE_DATA"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

const DEFAULT_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_SCHEMA: 422,
  UPSTREAM_RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
  STALE_DATA: 502,
  UPSTREAM_TIMEOUT: 504,
};

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { status?: number; details?: unknown; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "ApiError";
    this.code = code;
    this.status = options?.status ?? DEFAULT_STATUS_BY_CODE[code];
    this.details = options?.details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function classifyUpstreamError(
  error: unknown,
  fallbackMessage = "Sumber eksternal tidak dapat dijangkau",
): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      msg.includes("timeout") ||
      msg.includes("timed out")
    ) {
      return new ApiError("UPSTREAM_TIMEOUT", fallbackMessage, {
        cause: error,
      });
    }
    if (msg.includes("429") || msg.includes("rate limit")) {
      return new ApiError("UPSTREAM_RATE_LIMIT", fallbackMessage, {
        cause: error,
      });
    }
    return new ApiError("INTERNAL_ERROR", error.message || fallbackMessage, {
      status: 502,
      cause: error,
    });
  }

  return new ApiError("INTERNAL_ERROR", fallbackMessage, { status: 502 });
}