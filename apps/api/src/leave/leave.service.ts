import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Quicker } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

export interface SubmitLeave {
  kind: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async quickerOf(userId: string): Promise<Quicker> {
    const q = await this.prisma.quicker.findUnique({ where: { userId } });
    if (!q) {
      throw new ForbiddenException("El usuario no es un quicker");
    }
    return q;
  }

  async submit(userId: string, input: SubmitLeave) {
    const q = await this.quickerOf(userId);
    const r = await this.prisma.leaveRequest.create({
      data: {
        quickerId: q.id,
        kind: input.kind,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
      },
    });
    await this.audit.record({
      action: "leave.submit",
      outcome: "success",
      actorId: userId,
      resourceType: "leave",
      resourceId: r.id,
      metadata: { kind: input.kind },
    });
    return r;
  }

  async listForQuicker(userId: string) {
    const q = await this.quickerOf(userId);
    return this.prisma.leaveRequest.findMany({ where: { quickerId: q.id }, orderBy: { createdAt: "desc" } });
  }

  /** Quickers activos para el selector del formulario admin. */
  quickerOptions() {
    return this.prisma.quicker.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, zone: true },
    });
  }

  /**
   * Crea una solicitud a nombre de un quicker (cargada por Operación). Puede
   * quedar en revisión o aprobarse directamente si quien la carga lo decide.
   */
  async createForQuicker(quickerId: string, input: SubmitLeave, actorId: string, approve = false) {
    const q = await this.prisma.quicker.findUnique({ where: { id: quickerId } });
    if (!q) {
      throw new NotFoundException("Quicker no encontrado");
    }
    const r = await this.prisma.leaveRequest.create({
      data: {
        quickerId,
        kind: input.kind,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        ...(approve ? { status: "aprobada", reviewedById: actorId, reviewedAt: new Date() } : {}),
      },
    });
    await this.audit.record({
      action: "leave.create_admin",
      outcome: "success",
      actorId,
      resourceType: "leave",
      resourceId: r.id,
      metadata: { quickerId, kind: input.kind, approved: approve },
    });
    return r;
  }

  listAll(status?: string) {
    return this.prisma.leaveRequest.findMany({
      where: status ? { status: status as "en_revision" | "aprobada" | "rechazada" } : {},
      orderBy: { createdAt: "desc" },
      include: { quicker: { select: { name: true, zone: true } } },
    });
  }

  async decide(id: string, status: "aprobada" | "rechazada", actorId: string) {
    const r = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!r) {
      throw new NotFoundException("Solicitud no encontrada");
    }
    if (r.status !== "en_revision") {
      throw new BadRequestException("La solicitud ya fue decidida");
    }
    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status, reviewedById: actorId, reviewedAt: new Date() },
    });
    await this.audit.record({
      action: "leave.decide",
      outcome: "success",
      actorId,
      resourceType: "leave",
      resourceId: id,
      before: { status: r.status },
      after: { status },
    });
    return updated;
  }
}
