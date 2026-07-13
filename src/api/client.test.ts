/**
 * Unit tests for the frontend API client — fetchApi and ApiError.
 * Tests the seam: fetch wrapper behavior on success, non-2xx, and network error.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, fetchApi } from "./client";

/* ------------------------------------------------------------------ */
/*  Setup / teardown                                                  */
/* ------------------------------------------------------------------ */

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as typeof fetch;
}

function mockFetchNetworkError() {
  globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as unknown as typeof fetch;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("fetchApi", () => {
  it("returns parsed JSON on 2xx response", async () => {
    mockFetch(200, { token: "abc", link: "/exam/abc" });

    const result = await fetchApi<{ token: string; link: string }>("/api/exams");

    expect(result).toEqual({ token: "abc", link: "/exam/abc" });
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/exams", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("passes custom headers alongside the default Content-Type", async () => {
    mockFetch(200, { ok: true });

    await fetchApi("/api/exams", {
      headers: { Authorization: "Bearer token123" },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/exams", {
      headers: { "Content-Type": "application/json", Authorization: "Bearer token123" },
    });
  });

  it("passes POST method and body through", async () => {
    mockFetch(201, { token: "new" });

    await fetchApi("/api/exams", {
      method: "POST",
      body: JSON.stringify({ jobTitle: "Dev" }),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/exams", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ jobTitle: "Dev" }),
    });
  });

  it("throws ApiError with status on 404", async () => {
    mockFetch(404, { error: "not found" });

    await expect(fetchApi("/api/exams/bad")).rejects.toThrow(ApiError);
    try {
      await fetchApi("/api/exams/bad");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });

  it("throws ApiError with status on 410", async () => {
    mockFetch(410, { error: "exam already used" });

    await expect(fetchApi("/api/exams/used")).rejects.toThrow(ApiError);
    try {
      await fetchApi("/api/exams/used");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(410);
    }
  });

  it("throws ApiError with status on 500", async () => {
    mockFetch(500, { error: "internal" });

    await expect(fetchApi("/api/exams/crash")).rejects.toThrow(ApiError);
    try {
      await fetchApi("/api/exams/crash");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
    }
  });

  it("throws on network error", async () => {
    mockFetchNetworkError();

    await expect(fetchApi("/api/exams")).rejects.toThrow();
  });
});
