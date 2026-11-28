import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, withRetry } from "@/lib/api/client";
import { getToken, saveSession } from "@/lib/session";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("request", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("sends the bearer token and JSON body", async () => {
    saveSession("tok-123", { id: "u1", name: "A", role: "student" });
    const fetchMock = mockFetch(200, { ok: true });
    await request("/tokens/wallet", { method: "POST", body: { a: 1 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/tokens/wallet");
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("omits the token for anonymous calls", async () => {
    saveSession("tok-123", { id: "u1", name: "A", role: "student" });
    const fetchMock = mockFetch(200, {});
    await request("/auth/login", { method: "POST", anonymous: true, body: {} });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("turns FastAPI string details into ApiError messages", async () => {
    mockFetch(402, { detail: "No interview tokens left." });
    await expect(request("/interviews/start", { method: "POST" })).rejects.toMatchObject({
      status: 402,
      message: "No interview tokens left.",
    });
  });

  it("turns validation errors into a readable message", async () => {
    mockFetch(422, { detail: [{ loc: ["body", "password"], msg: "String should have at least 8 characters" }] });
    await expect(request("/auth/register", { method: "POST" })).rejects.toThrow("password: String should have at least 8 characters");
  });

  it("clears the session on 401 for authenticated calls", async () => {
    saveSession("tok-123", { id: "u1", name: "A", role: "student" });
    mockFetch(401, { detail: "Session expired" });
    await expect(request("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBe("");
  });

  it("maps network failures to status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(request("/health")).rejects.toMatchObject({ status: 0 });
  });

  it("adds query parameters and skips empty ones", async () => {
    const fetchMock = mockFetch(200, []);
    await request("/officer/shortlist", { query: { jd_id: "j1", empty: "", none: null } });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("jd_id")).toBe("j1");
    expect(url.searchParams.has("empty")).toBe(false);
    expect(url.searchParams.has("none")).toBe(false);
  });
});

describe("withRetry", () => {
  it("retries retryable errors and then succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError(503, "busy"))
      .mockRejectedValueOnce(new ApiError(0, "offline"))
      .mockResolvedValue("ok");
    const onRetry = vi.fn();
    await expect(withRetry(fn, { baseDelayMs: 1, onRetry })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("does not retry client errors", async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError(402, "no tokens"));
    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toMatchObject({ status: 402 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the attempt limit", async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError(503, "busy"));
    await expect(withRetry(fn, { attempts: 3, baseDelayMs: 1 })).rejects.toMatchObject({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
