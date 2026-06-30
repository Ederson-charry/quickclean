import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { generateTempPassword } from "../common/temp-password";
import { NotificationService } from "../notifications/notification.service";
import { PasswordService } from "../auth/password.service";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateClientInput,
  CreateQuickerInput,
  UpdateClientInput,
  UpdateQuickerInput,
} from "./staff.schemas";

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  private welcome(userId: string, email: string, role: "quicker" | "cliente", tempPassword: string) {
    return this.notifications
      .send({
        userId,
        to: email,
        kind: "welcome",
        subject: "Bienvenido a QuickClean",
        body:
          `Se creó tu cuenta de ${role} en QuickClean.\n` +
          `Usuario: ${email}\nContraseña temporal: ${tempPassword}\n\n` +
          "Por seguridad, deberás crear una contraseña nueva en tu primer ingreso.",
      })
      .catch(() => undefined);
  }

  /**
   * Regenera una contraseña temporal y fuerza el cambio en el próximo ingreso.
   * Revoca las sesiones activas y notifica. Devuelve la contraseña temporal (una vez).
   */
  private async resetPasswordForUser(userId: string, role: "quicker" | "cliente", actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }
    const tempPassword = generateTempPassword();
    const passwordHash = await this.password.hash(tempPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.credential.upsert({
        where: { userId },
        update: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date() },
        create: { userId, passwordHash, mustChangePassword: true },
      });
      await tx.session.deleteMany({ where: { userId } });
    });
    await this.audit.record({
      action: "staff.reset_password",
      outcome: "success",
      actorId,
      resourceType: "user",
      resourceId: userId,
    });
    await this.notifications
      .send({
        userId,
        to: user.email,
        kind: "password_reset",
        subject: "Tu contraseña de QuickClean fue restablecida",
        body:
          `Un administrador restableció tu contraseña.\n` +
          `Contraseña temporal: ${tempPassword}\n\n` +
          "Deberás crear una contraseña nueva en tu próximo ingreso.",
      })
      .catch(() => undefined);
    return { tempPassword };
  }

  private async roleId(key: string, name: string): Promise<string> {
    const role = await this.prisma.role.upsert({
      where: { key },
      update: {},
      create: { key, name },
    });
    return role.id;
  }

  private async assertEmailFree(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Ya existe una cuenta con ese correo");
    }
  }

  // ── Quickers ────────────────────────────────────────────────────────────────
  listQuickers() {
    return this.prisma.quicker.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        user: { select: { email: true, status: true, phone: true } },
        skills: { include: { serviceCategory: { select: { id: true, name: true } } } },
      },
    });
  }

  async createQuicker(input: CreateQuickerInput, actorId: string) {
    await this.assertEmailFree(input.email);
    const roleId = await this.roleId("quicker", "Quicker");
    const tempPassword = generateTempPassword();
    const passwordHash = await this.password.hash(tempPassword);

    const quicker = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, phone: input.phone, status: "active", emailVerifiedAt: new Date() },
      });
      await tx.credential.create({ data: { userId: user.id, passwordHash, mustChangePassword: true } });
      await tx.userRole.create({ data: { userId: user.id, roleId } });
      const q = await tx.quicker.create({
        data: { userId: user.id, name: input.name, zone: input.zone, rating: input.rating ?? 5 },
      });
      if (input.skills.length > 0) {
        await tx.quickerSkill.createMany({
          data: input.skills.map((serviceCategoryId) => ({ quickerId: q.id, serviceCategoryId })),
          skipDuplicates: true,
        });
      }
      return q;
    });

    await this.audit.record({
      action: "staff.create_quicker",
      outcome: "success",
      actorId,
      resourceType: "quicker",
      resourceId: quicker.id,
      metadata: { email: input.email, zone: input.zone, skills: input.skills.length },
    });
    await this.welcome(quicker.userId, input.email, "quicker", tempPassword);

    return { quicker, tempPassword };
  }

  async updateQuicker(id: string, input: UpdateQuickerInput, actorId: string) {
    const quicker = await this.prisma.quicker.findUnique({ where: { id } });
    if (!quicker) {
      throw new NotFoundException("Quicker no encontrado");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quicker.update({
        where: { id },
        data: {
          name: input.name ?? undefined,
          zone: input.zone ?? undefined,
          rating: input.rating ?? undefined,
          active: input.active ?? undefined,
        },
      });
      if (input.phone !== undefined) {
        await tx.user.update({ where: { id: quicker.userId }, data: { phone: input.phone || null } });
      }
      // Desactivar = también bloquear el acceso (status) y revocar sesiones.
      if (input.active !== undefined) {
        await tx.user.update({
          where: { id: quicker.userId },
          data: { status: input.active ? "active" : "inactive" },
        });
        if (!input.active) {
          await tx.session.deleteMany({ where: { userId: quicker.userId } });
        }
      }
      if (input.skills) {
        await tx.quickerSkill.deleteMany({ where: { quickerId: id } });
        if (input.skills.length > 0) {
          await tx.quickerSkill.createMany({
            data: input.skills.map((serviceCategoryId) => ({ quickerId: id, serviceCategoryId })),
            skipDuplicates: true,
          });
        }
      }
      return q;
    });

    await this.audit.record({
      action: "staff.update_quicker",
      outcome: "success",
      actorId,
      resourceType: "quicker",
      resourceId: id,
      after: { zone: updated.zone, active: updated.active, rating: updated.rating },
    });
    return updated;
  }

  resetQuickerPassword(id: string, actorId: string) {
    return this.prisma.quicker.findUnique({ where: { id } }).then((q) => {
      if (!q) {
        throw new NotFoundException("Quicker no encontrado");
      }
      return this.resetPasswordForUser(q.userId, "quicker", actorId);
    });
  }

  // ── Clientes ──────────────────────────────────────────────────────────────────
  listClients() {
    return this.prisma.client.findMany({
      orderBy: [{ kind: "desc" }, { name: "asc" }],
      include: { user: { select: { email: true, status: true, phone: true } } },
    });
  }

  async createClient(input: CreateClientInput, actorId: string) {
    await this.assertEmailFree(input.email);
    const roleId = await this.roleId("client", "Cliente");
    const tempPassword = generateTempPassword();
    const passwordHash = await this.password.hash(tempPassword);

    const client = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, phone: input.phone, status: "active", emailVerifiedAt: new Date() },
      });
      await tx.credential.create({ data: { userId: user.id, passwordHash, mustChangePassword: true } });
      await tx.userRole.create({ data: { userId: user.id, roleId } });
      return tx.client.create({
        data: {
          userId: user.id,
          name: input.name,
          kind: input.kind,
          docType: input.docType,
          docNumber: input.docNumber,
          requiresDirectHire: input.requiresDirectHire ?? input.kind === "empresa",
        },
      });
    });

    await this.audit.record({
      action: "staff.create_client",
      outcome: "success",
      actorId,
      resourceType: "client",
      resourceId: client.id,
      metadata: { email: input.email, kind: input.kind },
    });
    await this.welcome(client.userId, input.email, "cliente", tempPassword);

    return { client, tempPassword };
  }

  async updateClient(id: string, input: UpdateClientInput, actorId: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException("Cliente no encontrado");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const c = await tx.client.update({
        where: { id },
        data: {
          name: input.name ?? undefined,
          kind: input.kind ?? undefined,
          docType: input.docType ?? undefined,
          docNumber: input.docNumber ?? undefined,
          requiresDirectHire: input.requiresDirectHire ?? undefined,
        },
      });
      if (input.phone !== undefined) {
        await tx.user.update({ where: { id: client.userId }, data: { phone: input.phone || null } });
      }
      if (input.active !== undefined) {
        await tx.user.update({
          where: { id: client.userId },
          data: { status: input.active ? "active" : "inactive" },
        });
        if (!input.active) {
          await tx.session.deleteMany({ where: { userId: client.userId } });
        }
      }
      return c;
    });
    await this.audit.record({
      action: "staff.update_client",
      outcome: "success",
      actorId,
      resourceType: "client",
      resourceId: id,
      after: { kind: updated.kind, requiresDirectHire: updated.requiresDirectHire },
    });
    return updated;
  }

  resetClientPassword(id: string, actorId: string) {
    return this.prisma.client.findUnique({ where: { id } }).then((c) => {
      if (!c) {
        throw new NotFoundException("Cliente no encontrado");
      }
      return this.resetPasswordForUser(c.userId, "cliente", actorId);
    });
  }
}
