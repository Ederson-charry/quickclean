import { describe, expect, it } from "vitest";
import { PasswordService } from "./password.service";

const svc = new PasswordService();

describe("PasswordService", () => {
  it("hash y verify coherentes", async () => {
    const h = await svc.hash("Sup3rSecret!2026");
    expect(await svc.verify(h, "Sup3rSecret!2026")).toBe(true);
    expect(await svc.verify(h, "otra")).toBe(false);
  });

  it("isExpired true si pasaron > maxAge días", () => {
    const old = new Date(Date.now() - 91 * 86_400_000);
    expect(svc.isExpired(old)).toBe(true);
  });

  it("isExpired false si reciente", () => {
    expect(svc.isExpired(new Date())).toBe(false);
  });

  it("rechaza password corta", () => {
    expect(() => svc.assertPolicy("corta")).toThrow();
  });

  it("acepta password de longitud válida", () => {
    expect(() => svc.assertPolicy("x".repeat(12))).not.toThrow();
  });

  it("isReused detecta coincidencia con el historial", async () => {
    const h = await svc.hash("Sup3rSecret!2026");
    expect(await svc.isReused("Sup3rSecret!2026", [h])).toBe(true);
    expect(await svc.isReused("OtraDistinta!99", [h])).toBe(false);
  });
});
