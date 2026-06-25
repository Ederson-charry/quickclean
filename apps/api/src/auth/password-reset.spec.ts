import { createHash } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import { LockoutService } from "./lockout.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

describe("AuthService recuperación/reset (integración)", () => {
  const prisma = new PrismaService();
  const password = new PasswordService();
  const auth = new AuthService(
    new UsersService(prisma),
    password,
    new LockoutService(),
    new TokenService(new JwtService({ secret: "test-secret" }), prisma),
    prisma,
    new AuditService(prisma),
    new NotificationService(prisma),
  );
  const ts = Date.now();
  const email = `reset-${ts}@x.co`;
  let userId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const user = await prisma.user.create({ data: { email, status: "active" } });
    userId = user.id;
    await prisma.credential.create({ data: { userId, passwordHash: await password.hash("ViejaClave-2026!") } });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.passwordHistory.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.credential.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("requestPasswordReset crea token y notificación (correo existente)", async () => {
    await auth.requestPasswordReset(email, {});
    const tokens = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(tokens).toHaveLength(1);
    const notif = await prisma.notification.findFirst({ where: { userId, kind: "password_reset" } });
    expect(notif?.to).toBe(email);
    expect(notif?.body).toContain("/restablecer?token=");
  });

  it("requestPasswordReset con correo inexistente no lanza ni crea token", async () => {
    await expect(auth.requestPasswordReset(`nadie-${ts}@x.co`, {})).resolves.toBeUndefined();
  });

  it("resetPassword con token válido cambia la contraseña y lo invalida", async () => {
    // genera un token controlado
    const raw = "raw-token-de-prueba-123456";
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt: new Date(Date.now() + 600_000) },
    });
    await auth.resetPassword(raw, "ClaveReset-2026!", {});
    const cred = await prisma.credential.findUnique({ where: { userId } });
    expect(await password.verify(cred!.passwordHash, "ClaveReset-2026!")).toBe(true);
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    expect(row?.usedAt).not.toBeNull();
  });

  it("rechaza token inexistente/usado", async () => {
    await expect(auth.resetPassword("token-que-no-existe-xxxx", "OtraClave-2026!", {})).rejects.toThrow();
  });

  it("rechaza token expirado", async () => {
    const raw = "raw-expirado-7890";
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: createHash("sha256").update(raw).digest("hex"),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await expect(auth.resetPassword(raw, "ClaveX-2026!!", {})).rejects.toThrow();
  });
});
