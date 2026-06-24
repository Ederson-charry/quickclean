import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TurnstileService } from "./turnstile.service";

describe("TurnstileService", () => {
  const realSecret = process.env.TURNSTILE_SECRET;
  const realFetch = globalThis.fetch;

  afterEach(() => {
    if (realSecret === undefined) {
      delete process.env.TURNSTILE_SECRET;
    } else {
      process.env.TURNSTILE_SECRET = realSecret;
    }
    globalThis.fetch = realFetch;
  });

  it("verify true cuando Cloudflare responde success", async () => {
    process.env.TURNSTILE_SECRET = "s";
    globalThis.fetch = vi.fn(async () => ({ json: async () => ({ success: true }) })) as never;
    expect(await new TurnstileService().verify("token", "1.2.3.4")).toBe(true);
  });

  it("verify false cuando success=false", async () => {
    process.env.TURNSTILE_SECRET = "s";
    globalThis.fetch = vi.fn(async () => ({ json: async () => ({ success: false }) })) as never;
    expect(await new TurnstileService().verify("token", "1.2.3.4")).toBe(false);
  });

  it("assert no lanza si TURNSTILE_SECRET no está configurado (dev)", async () => {
    delete process.env.TURNSTILE_SECRET;
    await expect(new TurnstileService().assert(undefined, "1.2.3.4")).resolves.toBeUndefined();
  });

  it("assert lanza 403 si el challenge es requerido y el token falta", async () => {
    process.env.TURNSTILE_SECRET = "s";
    await expect(new TurnstileService().assert(undefined, "1.2.3.4")).rejects.toThrow();
  });
});
