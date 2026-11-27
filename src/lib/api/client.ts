/**
 * Low-level HTTP client for the PlacePrep backend.
 *
 * - Attaches the bearer token.
 * - Turns FastAPI error bodies ({detail: string | object | ValidationError[]}) into a
 *   readable `ApiError` with the HTTP status, so callers can branch on 401/402/409/503.
 * - On 401 for an authenticated call, clears the session and sends the user to /login.
 * - `withRetry` retries only failures that are safe to retry (network errors, 429, 502-504).
 */

import { env } from "@/lib/env";
import { clearSession, getToken } from "@/lib/session";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  /** True when retrying the same request may succeed. */
  get retryable(): boolean {
    return this.status === 0 || this.status === 429 || (this.status >= 502 && this.status <= 504) || this.status === 503;
  }
}

function messageFrom(status: number, body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined;
      if (first?.msg) {
        const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
        return field ? `${String(field)}: ${first.msg}` : first.msg;
      }
    }
    if (detail && typeof detail === "object" && "message" in detail) {
      return String((detail as { message: unknown }).message);
    }
  }
  if (status === 0) return "Cannot reach the server. Check your internet connection.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "The server had a problem. Please try again.";
  return `Request failed (${status})`;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Send without the bearer token (login, register, public endpoints). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, anonymous = false, signal } = options;

  const url = new URL(`${env.apiBaseUrl}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = anonymous ? "" : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), { method, headers, body: payload, signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, messageFrom(0, null));
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token) {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    const detail = data && typeof data === "object" && "detail" in data ? (data as { detail: unknown }).detail : data;
    throw new ApiError(res.status, messageFrom(res.status, data), detail);
  }

  return data as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retries a request that is safe to repeat. The caller must make it idempotent
 * (for interview turns, the same `turn_id` is reused across attempts).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 4, baseDelayMs = 800, onRetry }: { attempts?: number; baseDelayMs?: number; onRetry?: (attempt: number, err: ApiError) => void } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!(err instanceof ApiError) || !err.retryable || attempt === attempts) throw err;
      onRetry?.(attempt, err);
      const jitter = Math.random() * 300;
      await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter);
    }
  }
  throw lastError;
}

/** A random id for idempotency keys (turn ids). */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
