import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { LoginInput } from "@quickclean/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LockoutService } from "./lockout.service";
import { PasswordService } from "./password.service";
import type { IssuedTokens } from "./token.service";
import { TokenService } from "./token.service";
import { UsersService } from "../users/users.service";

export type LoginResult = IssuedTokens | { mustChangePassword: true };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly password: PasswordService,
    private readonly lockout: LockoutService,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async login(input: LoginInput, ctx: { ip?: string; userAgent?: string }): Promise<LoginResult> {
    const user = await this.users.findByEmail(input.email);
    // respuesta uniforme anti-enumeración
    const fail = (): never => {
      throw new UnauthorizedException("Credenciales inválidas");
    };
    if (!user || !user.credential) {
      // gasta el mismo tiempo que una verificación real (anti-enumeración por timing)
      await this.password.burnTime(input.password);
      return fail();
    }

    if (user.status === "inactive" || (await this.users.isInactive(user.id))) {
      throw new ForbiddenException("Cuenta inactiva: requiere reactivación");
    }
    if (this.lockout.isLocked(user.lockedUntil)) {
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
      return fail();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    await this.users.touchActivity(user.id);

    if (user.credential.mustChangePassword || this.password.isExpired(user.credential.passwordChangedAt)) {
      return { mustChangePassword: true };
    }

    const permissions = await this.users.permissionsOf(user.id);
    return this.tokens.issue({ userId: user.id, permissions, ...ctx });
  }
}
