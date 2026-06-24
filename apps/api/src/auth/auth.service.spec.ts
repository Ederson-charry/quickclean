import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
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
      profile: async () => ({ id: "u1", email: "a@b.co", roles: ["super_admin"], permissions: ["audit.read"] }),
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
    tokens: {
      issue: async () => ({ accessToken: "a", refreshToken: "r" }),
      rotate: async (
        _presented: string,
        resolve: (userId: string) => Promise<string[]> | string[],
      ) => {
        await resolve("u1");
        return { accessToken: "a2", refreshToken: "r2" };
      },
      revokeFamily: async () => {},
      ...overrides.tokens,
    },
    auditor: { record: vi.fn(async () => ({})), ...overrides.auditor },
    prisma: { user: { update: async () => ({}) }, ...overrides.prisma },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function build(d: ReturnType<typeof deps>): AuthService {
  return new AuthService(d.users, d.password, d.lockout, d.tokens, d.prisma, d.auditor);
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

  it("registra auditoría auth.login/success en login exitoso", async () => {
    const d = deps();
    await build(d).login(cred, { ip: "1.2.3.4" });
    expect(d.auditor.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.login", outcome: "success", actorId: "u1" }),
    );
  });

  it("registra auditoría auth.login/failure en password incorrecta", async () => {
    const d = deps({ password: { verify: async () => false } });
    await expect(build(d).login(cred, {})).rejects.toThrow();
    expect(d.auditor.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.login", outcome: "failure" }),
    );
  });
});

describe("AuthService.refresh", () => {
  it("rota y re-deriva permisos del usuario", async () => {
    const d = deps();
    const permsSpy = vi.spyOn(d.users, "permissionsOf");
    const svc = build(d);
    const r = await svc.refresh("fam:secreto");
    expect(r.accessToken).toBe("a2");
    expect(permsSpy).toHaveBeenCalledWith("u1");
  });

  it("sin refresh token lanza Unauthorized", async () => {
    await expect(build(deps()).refresh(undefined)).rejects.toThrow(UnauthorizedException);
  });
});

describe("AuthService.me", () => {
  it("devuelve el perfil con roles y permisos", async () => {
    const r = await build(deps()).me("u1");
    expect(r.roles).toContain("super_admin");
    expect(r.permissions).toContain("audit.read");
  });

  it("lanza Unauthorized si el usuario no existe", async () => {
    const svc = build(deps({ users: { profile: async () => null } }));
    await expect(svc.me("u1")).rejects.toThrow();
  });
});

describe("AuthService.logout", () => {
  it("revoca la familia del refresh presentado", async () => {
    const d = deps();
    const revokeSpy = vi.spyOn(d.tokens, "revokeFamily");
    await build(d).logout("fam123:secreto");
    expect(revokeSpy).toHaveBeenCalledWith("fam123");
  });

  it("sin token no revoca nada (no lanza)", async () => {
    const d = deps();
    const revokeSpy = vi.spyOn(d.tokens, "revokeFamily");
    await expect(build(d).logout(undefined)).resolves.toBeUndefined();
    expect(revokeSpy).not.toHaveBeenCalled();
  });
});
