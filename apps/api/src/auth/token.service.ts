import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 14;
const sha = (s: string): string => createHash("sha256").update(s).digest("hex");

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IssueInput {
  userId: string;
  permissions: string[];
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private signAccess(userId: string, permissions: string[]): string {
    return this.jwt.sign({ sub: userId, permissions }, { expiresIn: ACCESS_TTL });
  }

  /** Emite un par de tokens en una familia nueva (login). */
  issue(input: IssueInput): Promise<IssuedTokens> {
    return this.persist(input.userId, input.permissions, randomUUID(), input.ip, input.userAgent);
  }

  private async persist(
    userId: string,
    permissions: string[],
    familyId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const secret = `${randomUUID()}.${randomUUID()}`;
    await this.prisma.session.create({
      data: {
        userId,
        familyId,
        refreshTokenHash: sha(secret),
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000),
      },
    });
    return {
      accessToken: this.signAccess(userId, permissions),
      refreshToken: `${familyId}:${secret}`,
    };
  }

  /**
   * Rota un refresh token. Si el token presentado no existe o ya fue rotado
   * (revocado), se asume robo y se revoca toda la familia.
   */
  async rotate(presented: string, permissions: string[] = []): Promise<IssuedTokens> {
    const sep = presented.indexOf(":");
    const familyId = sep === -1 ? "" : presented.slice(0, sep);
    const secret = sep === -1 ? "" : presented.slice(sep + 1);

    const match = await this.prisma.session.findFirst({
      where: { familyId, refreshTokenHash: sha(secret) },
    });

    if (!match || match.revokedAt) {
      await this.revokeFamily(familyId);
      throw new UnauthorizedException("Refresh inválido");
    }

    await this.prisma.session.update({
      where: { id: match.id },
      data: { revokedAt: new Date() },
    });
    return this.persist(match.userId, permissions, familyId, match.ip ?? undefined, match.userAgent ?? undefined);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { familyId },
      data: { revokedAt: new Date() },
    });
  }
}
