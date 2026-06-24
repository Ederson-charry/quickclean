import { Injectable } from "@nestjs/common";
import { authenticator } from "otplib";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string): Promise<{ secret: string; otpauth: string }> {
    const secret = authenticator.generateSecret();
    await this.prisma.mfaFactor.create({ data: { userId, type: "totp", secret, isDefault: true } });
    const otpauth = authenticator.keyuri(userId, "QuickClean", secret);
    return { secret, otpauth };
  }

  async confirm(userId: string, token: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({ where: { userId, type: "totp" } });
    if (!factor || !authenticator.verify({ token, secret: factor.secret })) {
      return false;
    }
    await this.prisma.mfaFactor.update({
      where: { id: factor.id },
      data: { confirmedAt: new Date() },
    });
    return true;
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({
      where: { userId, type: "totp", confirmedAt: { not: null } },
    });
    if (!factor) {
      return false;
    }
    return authenticator.verify({ token, secret: factor.secret });
  }

  async isEnrolled(userId: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({
      where: { userId, type: "totp", confirmedAt: { not: null } },
    });
    return factor != null;
  }
}
