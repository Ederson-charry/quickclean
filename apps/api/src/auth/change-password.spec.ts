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

describe("AuthService.changePassword (integración) — primer ingreso forzado", () => {
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
  const email = `cpw-${ts}@x.co`;
  let userId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const user = await prisma.user.create({ data: { email, status: "active" } });
    userId = user.id;
    await prisma.credential.create({
      data: { userId, passwordHash: await password.hash("TempPass-2026!"), mustChangePassword: true },
    });
  });

  afterAll(async () => {
    await prisma.passwordHistory.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.credential.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("rechaza contraseña actual incorrecta", async () => {
    await expect(
      auth.changePassword({ email, currentPassword: "incorrecta-xx", newPassword: "NuevaClave-2026!" }, {}),
    ).rejects.toThrow();
  });

  it("cambia la contraseña, limpia el flag y emite tokens", async () => {
    const tokens = await auth.changePassword(
      { email, currentPassword: "TempPass-2026!", newPassword: "NuevaClave-2026!" },
      {},
    );
    expect(tokens.accessToken).toBeTruthy();
    const cred = await prisma.credential.findUnique({ where: { userId } });
    expect(cred?.mustChangePassword).toBe(false);
  });

  it("impide reutilizar una contraseña del historial", async () => {
    await expect(
      auth.changePassword(
        { email, currentPassword: "NuevaClave-2026!", newPassword: "TempPass-2026!" },
        {},
      ),
    ).rejects.toThrow();
  });

  it("login posterior funciona con la contraseña nueva (sin mustChange)", async () => {
    const result = await auth.login({ email, password: "NuevaClave-2026!" }, {});
    expect("accessToken" in result).toBe(true);
  });
});
