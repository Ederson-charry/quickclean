import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { ForcedPasswordChangeInput, LoginInput } from "@quickclean/shared";
import { security } from "../config/security.config";
import { AuditService } from "../audit/audit.service";
import type { AuditOutcomeValue } from "../audit/audit.hash";
import { NotificationService } from "../notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { LockoutService } from "./lockout.service";
import { PasswordService } from "./password.service";
import type { IssuedTokens } from "./token.service";
import { TokenService } from "./token.service";

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutos

export type LoginResult = IssuedTokens | { mustChangePassword: true };

interface Ctx {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly password: PasswordService,
    private readonly lockout: LockoutService,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly auditor: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  private hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Rota la credencial: exige política, impide reutilizar el historial reciente,
   * archiva la anterior, recorta el historial y limpia el flag de cambio forzado.
   */
  private async rotateCredential(userId: string, currentHash: string | null, newPlain: string): Promise<void> {
    this.password.assertPolicy(newPlain);
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: security.passwordHistory,
    });
    const recent = [currentHash, ...history.map((h) => h.passwordHash)].filter(Boolean) as string[];
    if (recent.length > 0 && (await this.password.isReused(newPlain, recent))) {
      throw new BadRequestException(`No puedes reutilizar tus últimas ${security.passwordHistory} contraseñas`);
    }
    const newHash = await this.password.hash(newPlain);
    await this.prisma.$transaction(async (tx) => {
      if (currentHash) {
        await tx.passwordHistory.create({ data: { userId, passwordHash: currentHash } });
      }
      const old = await tx.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: security.passwordHistory,
        select: { id: true },
      });
      if (old.length > 0) {
        await tx.passwordHistory.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
      }
      await tx.credential.upsert({
        where: { userId },
        update: { passwordHash: newHash, passwordChangedAt: new Date(), mustChangePassword: false },
        create: { userId, passwordHash: newHash, mustChangePassword: false },
      });
      await tx.user.update({
        where: { id: userId },
        data: { failedLoginCount: 0, lockedUntil: null, status: "active" },
      });
    });
  }

  private audit(
    action: string,
    outcome: AuditOutcomeValue,
    ctx: Ctx,
    extra: { actorId?: string | null; metadata?: Record<string, unknown> } = {},
  ): Promise<unknown> {
    return this.auditor.record({
      action,
      outcome,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      actorId: extra.actorId ?? null,
      metadata: extra.metadata ?? null,
    });
  }

  async login(input: LoginInput, ctx: Ctx): Promise<LoginResult> {
    const user = await this.users.findByEmail(input.email);
    const fail = (): never => {
      throw new UnauthorizedException("Credenciales inválidas");
    };

    if (!user || !user.credential) {
      // gasta el mismo tiempo que una verificación real (anti-enumeración por timing)
      await this.password.burnTime(input.password);
      await this.audit("auth.login", "failure", ctx, {
        metadata: { email: input.email, reason: "unknown_user" },
      });
      return fail();
    }

    if (user.status === "inactive" || (await this.users.isInactive(user.id))) {
      await this.audit("auth.login", "denied", ctx, { actorId: user.id, metadata: { reason: "inactive" } });
      throw new ForbiddenException("Cuenta inactiva: requiere reactivación");
    }
    if (this.lockout.isLocked(user.lockedUntil)) {
      await this.audit("auth.login", "denied", ctx, { actorId: user.id, metadata: { reason: "locked" } });
      throw new UnauthorizedException("Cuenta bloqueada hasta mañana por intentos fallidos");
    }

    const ok = await this.password.verify(user.credential.passwordHash, input.password);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      const lockedUntil = this.lockout.shouldLock(failed) ? this.lockout.nextMidnightBogota() : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lockedUntil ? 0 : failed,
          lockedUntil,
          status: lockedUntil ? "locked" : user.status,
        },
      });
      await this.audit("auth.login", "failure", ctx, {
        actorId: user.id,
        metadata: { reason: "bad_password", lockedNow: lockedUntil != null },
      });
      return fail();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    await this.users.touchActivity(user.id);

    if (user.credential.mustChangePassword || this.password.isExpired(user.credential.passwordChangedAt)) {
      await this.audit("auth.login", "success", ctx, {
        actorId: user.id,
        metadata: { passwordChangeRequired: true },
      });
      return { mustChangePassword: true };
    }

    const permissions = await this.users.permissionsOf(user.id);
    const issued = await this.tokens.issue({ userId: user.id, permissions, ...ctx });
    await this.audit("auth.login", "success", ctx, { actorId: user.id });
    return issued;
  }

  /**
   * Cambia la contraseña (flujo de primer ingreso forzado). Sin sesión: valida la
   * contraseña actual, exige política e impide reutilizar el historial reciente.
   * Respuestas uniformes (anti-enumeración). Al terminar emite tokens (auto-login).
   */
  async changePassword(input: ForcedPasswordChangeInput, ctx: Ctx): Promise<IssuedTokens> {
    const invalid = (): never => {
      throw new UnauthorizedException("Credenciales inválidas");
    };
    const user = await this.users.findByEmail(input.email);
    if (!user || !user.credential) {
      await this.password.burnTime(input.currentPassword);
      await this.audit("auth.password_change", "failure", ctx, {
        metadata: { email: input.email, reason: "unknown_user" },
      });
      return invalid();
    }
    if (this.lockout.isLocked(user.lockedUntil)) {
      await this.audit("auth.password_change", "denied", ctx, { actorId: user.id, metadata: { reason: "locked" } });
      throw new UnauthorizedException("Cuenta bloqueada hasta mañana por intentos fallidos");
    }
    const ok = await this.password.verify(user.credential.passwordHash, input.currentPassword);
    if (!ok) {
      await this.audit("auth.password_change", "failure", ctx, {
        actorId: user.id,
        metadata: { reason: "bad_current_password" },
      });
      return invalid();
    }

    await this.rotateCredential(user.id, user.credential.passwordHash, input.newPassword);

    await this.audit("auth.password_change", "success", ctx, { actorId: user.id });
    const permissions = await this.users.permissionsOf(user.id);
    return this.tokens.issue({ userId: user.id, permissions, ...ctx });
  }

  /**
   * Solicita restablecer la contraseña. Respuesta uniforme (anti-enumeración): si
   * el correo existe, genera un token de un solo uso y lo notifica; si no, no hace
   * nada. El controlador siempre responde 200.
   */
  async requestPasswordReset(email: string, ctx: Ctx): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user) {
      const raw = randomBytes(32).toString("base64url");
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: this.hashToken(raw), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      });
      const appUrl = process.env.APP_URL ?? "http://localhost:5173";
      const link = `${appUrl}/restablecer?token=${raw}`;
      await this.notifications.send({
        userId: user.id,
        to: user.email,
        kind: "password_reset",
        subject: "Restablece tu contraseña de QuickClean",
        body:
          `Solicitaste restablecer tu contraseña. Abre este enlace (vence en 30 minutos):\n${link}\n\n` +
          "Si no fuiste tú, ignora este mensaje; tu contraseña sigue intacta.",
      });
    }
    await this.audit("auth.password_reset_request", "success", ctx, {
      actorId: user?.id ?? null,
      metadata: { email },
    });
  }

  /** Restablece la contraseña con un token válido (un solo uso, no expirado). */
  async resetPassword(token: string, newPassword: string, ctx: Ctx): Promise<void> {
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: this.hashToken(token) } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      await this.audit("auth.password_reset", "failure", ctx, { metadata: { reason: "invalid_token" } });
      throw new BadRequestException("El enlace de restablecimiento es inválido o expiró");
    }
    const cred = await this.prisma.credential.findUnique({ where: { userId: row.userId } });
    await this.rotateCredential(row.userId, cred?.passwordHash ?? null, newPassword);
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.audit("auth.password_reset", "success", ctx, { actorId: row.userId });
  }

  /** Perfil del usuario autenticado (identidad + roles + permisos). */
  async me(userId: string): Promise<{ id: string; email: string; roles: string[]; permissions: string[] }> {
    const profile = await this.users.profile(userId);
    if (!profile) {
      throw new UnauthorizedException("Usuario no encontrado");
    }
    return profile;
  }

  /** Rota el refresh presentado y re-deriva permisos actuales del usuario. */
  async refresh(presented: string | undefined, ctx: Ctx = {}): Promise<IssuedTokens> {
    if (!presented) {
      await this.audit("auth.refresh", "failure", ctx, { metadata: { reason: "no_token" } });
      throw new UnauthorizedException("Sin refresh token");
    }
    let actorId: string | null = null;
    try {
      const tokens = await this.tokens.rotate(presented, (userId) => {
        actorId = userId;
        return this.users.permissionsOf(userId);
      });
      await this.audit("auth.refresh", "success", ctx, { actorId });
      return tokens;
    } catch (err) {
      await this.audit("auth.refresh", "denied", ctx, { metadata: { reason: "invalid_or_reuse" } });
      throw err;
    }
  }

  /** Revoca la familia del refresh presentado (idempotente). */
  async logout(presented: string | undefined, ctx: Ctx = {}): Promise<void> {
    if (!presented) {
      return;
    }
    const sep = presented.indexOf(":");
    const familyId = sep === -1 ? "" : presented.slice(0, sep);
    if (familyId) {
      await this.tokens.revokeFamily(familyId);
      await this.audit("auth.logout", "success", ctx, { metadata: { familyId } });
    }
  }
}
