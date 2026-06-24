import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiUrl } from "./http";

describe("apiUrl", () => {
  it("compone sobre VITE_API_URL / base por defecto", () => {
    expect(apiUrl("/auth/login")).toMatch(/\/auth\/login$/);
  });
  it("no duplica el host", () => {
    expect(apiUrl("/health").startsWith("http")).toBe(true);
  });
});

describe("apiFetch", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("conserva Content-Type aunque el caller pase sus propios headers (Authorization)", async () => {
    let captured: RequestInit | undefined;
    globalThis.fetch = vi.fn(async (_url: string, init: RequestInit) => {
      captured = init;
      return { ok: true, json: async () => ({}) } as Response;
    }) as never;

    await apiFetch("/admin/x", { method: "POST", headers: { Authorization: "Bearer t" }, body: "{}" });

    const headers = captured?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer t");
    expect(captured?.method).toBe("POST");
  });
});
