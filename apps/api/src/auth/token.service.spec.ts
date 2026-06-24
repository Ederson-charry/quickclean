import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { TokenService } from "./token.service";

interface FakeSession {
  id: string;
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
}

function fakePrisma(): PrismaService {
  const sessions: FakeSession[] = [];
  return {
    session: {
      create: async ({ data }: { data: Partial<FakeSession> }) => {
        const s: FakeSession = {
          id: String(sessions.length + 1),
          ip: null,
          userAgent: null,
          revokedAt: null,
          ...data,
        } as FakeSession;
        sessions.push(s);
        return s;
      },
      findFirst: async ({ where }: { where: { familyId: string; refreshTokenHash: string } }) =>
        sessions.find(
          (s) => s.familyId === where.familyId && s.refreshTokenHash === where.refreshTokenHash,
        ) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<FakeSession> }) => {
        const s = sessions.find((x) => x.id === where.id)!;
        Object.assign(s, data);
        return s;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { familyId: string };
        data: Partial<FakeSession>;
      }) => {
        const affected = sessions.filter((s) => s.familyId === where.familyId);
        affected.forEach((s) => Object.assign(s, data));
        return { count: affected.length };
      },
    },
  } as unknown as PrismaService;
}

describe("TokenService", () => {
  const jwt = new JwtService({ secret: "test-secret" });

  it("emite access token con sub y permisos", async () => {
    const svc = new TokenService(jwt, fakePrisma());
    const { accessToken } = await svc.issue({ userId: "u1", permissions: ["audit.read"] });
    const payload = jwt.verify<{ sub: string; permissions: string[] }>(accessToken);
    expect(payload.sub).toBe("u1");
    expect(payload.permissions).toContain("audit.read");
  });

  it("rota refresh: el viejo deja de ser válido y rotarlo de nuevo revoca la familia", async () => {
    const svc = new TokenService(jwt, fakePrisma());
    const first = await svc.issue({ userId: "u1", permissions: [] });
    const rotated = await svc.rotate(first.refreshToken, []);
    expect(rotated.refreshToken).not.toEqual(first.refreshToken);
    // reúso del token viejo → detección de robo
    await expect(svc.rotate(first.refreshToken, [])).rejects.toThrow();
    // y tras la detección, el token rotado también queda revocado (familia revocada)
    await expect(svc.rotate(rotated.refreshToken, [])).rejects.toThrow();
  });

  it("rotar una familia inexistente lanza Unauthorized", async () => {
    const svc = new TokenService(jwt, fakePrisma());
    await expect(svc.rotate("no-existe:secreto", [])).rejects.toThrow();
  });

  it("un refresh expirado se rechaza (no rota para siempre)", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma);
    const first = await svc.issue({ userId: "u1", permissions: [] });
    const familyId = first.refreshToken.split(":")[0];
    // fuerza la expiración de la sesión recién creada
    await prisma.session.updateMany({
      where: { familyId },
      data: { expiresAt: new Date(Date.now() - 1000) } as never,
    });
    await expect(svc.rotate(first.refreshToken, [])).rejects.toThrow();
  });
});
