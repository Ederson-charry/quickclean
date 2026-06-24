import { describe, expect, it } from "vitest";
import { LockoutService } from "./lockout.service";

const svc = new LockoutService();

describe("LockoutService", () => {
  it("no bloquea con < 5 fallos", () => {
    expect(svc.shouldLock(4)).toBe(false);
  });

  it("bloquea al 5º fallo", () => {
    expect(svc.shouldLock(5)).toBe(true);
  });

  it("nextMidnightBogota da una fecha futura", () => {
    expect(svc.nextMidnightBogota().getTime()).toBeGreaterThan(Date.now());
  });

  it("nextMidnightBogota cae a medianoche America/Bogota (07:00 UTC)", () => {
    const next = svc.nextMidnightBogota();
    expect(next.getUTCHours()).toBe(5);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getUTCSeconds()).toBe(0);
  });

  it("isLocked respeta lockedUntil", () => {
    expect(svc.isLocked(new Date(Date.now() + 1000))).toBe(true);
    expect(svc.isLocked(new Date(Date.now() - 1000))).toBe(false);
    expect(svc.isLocked(null)).toBe(false);
  });
});
