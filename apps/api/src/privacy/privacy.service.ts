import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { DATA_POLICY } from "./privacy.policy";

interface Ctx {
  ip?: string;
  userAgent?: string;
}

export interface RectifyInput {
  phone?: string;
  name?: string;
}

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  policy() {
    return DATA_POLICY;
  }

  /** Estado de consentimiento del titular frente a la versión vigente de la política. */
  async consentStatus(userId: string) {
    const latest = await this.prisma.consent.findFirst({
      where: { userId, withdrawnAt: null },
      orderBy: { acceptedAt: "desc" },
    });
    const accepted = latest?.policyVersion === DATA_POLICY.version;
    return {
      currentVersion: DATA_POLICY.version,
      acceptedVersion: latest?.policyVersion ?? null,
      acceptedAt: latest?.acceptedAt ?? null,
      needsConsent: !accepted,
    };
  }

  async giveConsent(userId: string, ctx: Ctx) {
    const consent = await this.prisma.consent.create({
      data: { userId, policyVersion: DATA_POLICY.version, ip: ctx.ip ?? null },
    });
    await this.audit.record({
      action: "privacy.consent",
      outcome: "success",
      actorId: userId,
      resourceType: "consent",
      resourceId: consent.id,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: { policyVersion: DATA_POLICY.version },
    });
    return consent;
  }

  async withdrawConsent(userId: string, ctx: Ctx) {
    await this.prisma.consent.updateMany({
      where: { userId, withdrawnAt: null },
      data: { withdrawnAt: new Date() },
    });
    await this.audit.record({
      action: "privacy.consent_withdraw",
      outcome: "success",
      actorId: userId,
      resourceType: "consent",
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
    return { ok: true };
  }

  /** Exporta todos los datos personales del titular (derecho de acceso/portabilidad). */
  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { select: { key: true, name: true } } } },
        consents: true,
        notifications: { orderBy: { createdAt: "desc" }, take: 100 },
        sessions: { select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true } },
        clientProfile: { include: { contracts: true } },
        quickerProfile: {
          include: {
            skills: { include: { serviceCategory: { select: { name: true } } } },
            contracts: true,
            leaveRequests: true,
            payouts: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const bookings = await this.prisma.booking.findMany({
      where: { clientId: userId },
      include: { category: { select: { name: true } } },
      orderBy: { scheduledAt: "desc" },
    });

    await this.audit.record({
      action: "privacy.export",
      outcome: "success",
      actorId: userId,
      resourceType: "user",
      resourceId: userId,
    });

    return {
      exportedAt: new Date().toISOString(),
      policyVersion: DATA_POLICY.version,
      account: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        status: user.status,
        createdAt: user.createdAt,
        roles: user.roles.map((r) => r.role.key),
      },
      consents: user.consents,
      notifications: user.notifications,
      sessions: user.sessions,
      clientProfile: user.clientProfile,
      quickerProfile: user.quickerProfile,
      bookings,
    };
  }

  /** Rectificación de datos personales (teléfono y nombre del perfil). */
  async rectify(userId: string, input: RectifyInput, ctx: Ctx) {
    if (input.phone === undefined && input.name === undefined) {
      throw new BadRequestException("Nada para actualizar");
    }
    if (input.phone !== undefined) {
      await this.prisma.user.update({ where: { id: userId }, data: { phone: input.phone || null } });
    }
    if (input.name !== undefined) {
      const quicker = await this.prisma.quicker.findUnique({ where: { userId } });
      if (quicker) {
        await this.prisma.quicker.update({ where: { userId }, data: { name: input.name } });
      } else {
        const client = await this.prisma.client.findUnique({ where: { userId } });
        if (client) {
          await this.prisma.client.update({ where: { userId }, data: { name: input.name } });
        }
      }
    }
    await this.audit.record({
      action: "privacy.rectify",
      outcome: "success",
      actorId: userId,
      resourceType: "user",
      resourceId: userId,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: { fields: Object.keys(input) },
    });
    return { ok: true };
  }

  /**
   * Supresión de la cuenta (derecho al olvido con retención legal): anonimiza la PII,
   * revoca sesiones y desactiva el acceso. Conserva registros con deber legal
   * (reservas, pagos, nómina, auditoría) ya anonimizados.
   */
  async deleteAccount(userId: string, ctx: Ctx) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }
    if (user.deletedAt) {
      throw new BadRequestException("La cuenta ya fue suprimida");
    }
    const anonEmail = `deleted-${randomUUID()}@anonymized.local`;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { email: anonEmail, phone: null, status: "inactive", deletedAt: new Date() },
      });
      await tx.quicker.updateMany({ where: { userId }, data: { name: "Usuario eliminado" } });
      await tx.client.updateMany({ where: { userId }, data: { name: "Usuario eliminado" } });
      await tx.consent.updateMany({ where: { userId, withdrawnAt: null }, data: { withdrawnAt: new Date() } });
      await tx.session.deleteMany({ where: { userId } });
    });
    await this.audit.record({
      action: "privacy.delete",
      outcome: "success",
      actorId: userId,
      resourceType: "user",
      resourceId: userId,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
    return { ok: true };
  }
}
