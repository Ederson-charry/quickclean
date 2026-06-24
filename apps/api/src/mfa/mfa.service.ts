import { Injectable } from "@nestjs/common";
import type { MfaFactor } from "@prisma/client";
import { authenticator } from "otplib";
import { EncryptionService } from "../common/encryption.service";
import { PrismaService } from "../prisma/prisma.service";

const PERIOD_SECONDS = 30;

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async enroll(userId: string): Promise<{ secret: string; otpauth: string }> {
    const secret = authenticator.generateSecret();
    await this.prisma.mfaFactor.create({
      data: { userId, type: "totp", secret: this.encryption.encrypt(secret), isDefault: true },
    });
    const otpauth = authenticator.keyuri(userId, "QuickClean", secret);
    return { secret, otpauth };
  }

  /**
   * Valida el código contra la semilla descifrada y aplica anti-replay:
   * rechaza un código cuyo paso TOTP ya fue consumido. Devuelve si fue válido.
   */
  private async consume(factor: MfaFactor, token: string): Promise<boolean> {
    const secret = this.encryption.decrypt(factor.secret);
    const delta = authenticator.checkDelta(token, secret); // -1 | 0 | 1 | null
    if (delta === null) {
      return false;
    }
    const tokenStep = BigInt(Math.floor(Date.now() / 1000 / PERIOD_SECONDS) + delta);
    if (factor.lastUsedStep != null && tokenStep <= factor.lastUsedStep) {
      return false; // reúso del mismo (o un) paso ya consumido
    }
    await this.prisma.mfaFactor.update({
      where: { id: factor.id },
      data: { lastUsedStep: tokenStep },
    });
    return true;
  }

  async confirm(userId: string, token: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({ where: { userId, type: "totp" } });
    if (!factor || !(await this.consume(factor, token))) {
      return false;
    }
    await this.prisma.mfaFactor.update({ where: { id: factor.id }, data: { confirmedAt: new Date() } });
    return true;
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({
      where: { userId, type: "totp", confirmedAt: { not: null } },
    });
    if (!factor) {
      return false;
    }
    return this.consume(factor, token);
  }

  async isEnrolled(userId: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({
      where: { userId, type: "totp", confirmedAt: { not: null } },
    });
    return factor != null;
  }
}
