import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service";

type Overrides = Record<string, Record<string, unknown>>;

function deps(overrides: Overrides = {}) {
  return {
    users: {
      findByEmail: async () => ({
        id: "u1",
        status: "active",
        failedLoginCount: 0,
        lockedUntil: null,
        credential: { passwordHash: "h", passwordChangedAt: new Date(), mustChangePassword: false },
      }),
      permissionsOf: async () => [],
      touchActivity: async () => {},
      isInactive: async () => false,
      ...overrides.users,
    },
    password: { verify: async () => true, isExpired: () => false, ...overrides.password },
    lockout: {
      isLocked: () => false,
      shouldLock: () => false,
      nextMidnightBogota: () => new Date(Date.now() + 1000),
      ...overrides.lockout,
    },
    tokens: { issue: async () => ({ accessToken: "a", refreshToken: "r" }), ...overrides.tokens },
    prisma: { user: { update: async () => ({}) }, ...overrides.prisma },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function build(d: ReturnType<typeof deps>): AuthService {
  return new AuthService(d.users, d.password, d.lockout, d.tokens, d.prisma);
}

const cred = { email: "a@b.co", password: "x".repeat(12) };

describe("AuthService.login", () => {
  it("éxito devuelve tokens", async () => {
    const r = await build(deps()).login(cred, {});
    expect("accessToken" in r && r.accessToken).toBe("a");
  });

  it("password incorrecta lanza Unauthorized", async () => {
    const svc = build(deps({ password: { verify: async () => false } }));
    await expect(svc.login(cred, {})).rejects.toThrow(UnauthorizedException);
  });

  it("cuenta bloqueada lanza Unauthorized", async () => {
    const svc = build(deps({ lockout: { isLocked: () => true } }));
    await expect(svc.login(cred, {})).rejects.toThrow(/bloquead/);
  });

  it("cuenta inactiva lanza Forbidden", async () => {
    const svc = build(deps({ users: { isInactive: async () => true } }));
    await expect(svc.login(cred, {})).rejects.toThrow(ForbiddenException);
  });

  it("password expirada exige cambio", async () => {
    const svc = build(deps({ password: { verify: async () => true, isExpired: () => true } }));
    const r = await svc.login(cred, {});
    expect("mustChangePassword" in r && r.mustChangePassword).toBe(true);
  });
});
