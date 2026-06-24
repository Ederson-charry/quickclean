import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { LoginInput } from "@quickclean/shared";
import { AuditService } from "../audit/audit.service";
import type { AuditOutcomeValue } from "../audit/audit.hash";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { LockoutService } from "./lockout.service";
import { PasswordService } from "./password.service";
import type { IssuedTokens } from "./token.service";
import { TokenService } from "./token.service";

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
  ) {}

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
