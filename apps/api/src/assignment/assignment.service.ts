import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

export interface Candidate {
  quickerId: string;
  name: string;
  zone: string;
  rating: number;
  hasSkill: boolean;
  load: number;
  zoneMatch: boolean;
  clash: boolean;
  score: number;
}

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Rankea candidatos para una reserva por idoneidad (asistido, no automático):
   * capacidad/skill por categoría, zona, carga actual, rating y choque de agenda.
   */
  async rankCandidates(bookingId: string): Promise<Candidate[]> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }
    const quickers = await this.prisma.quicker.findMany({
      where: { active: true },
      include: { skills: true },
    });

    const candidates = await Promise.all(
      quickers.map(async (q) => {
        const hasSkill = q.skills.some((s) => s.serviceCategoryId === booking.serviceCategoryId);
        const activeBookings = await this.prisma.booking.findMany({
          where: { quickerId: q.userId, status: { in: ["agendado", "en_curso"] } },
          select: { scheduledAt: true },
        });
        const load = activeBookings.length;
        const clash = activeBookings.some(
          (b) => b.scheduledAt.getTime() === booking.scheduledAt.getTime(),
        );
        const zoneMatch = booking.address.toLowerCase().includes(q.zone.toLowerCase());

        const score =
          (hasSkill ? 100 : 0) + q.rating * 4 - load * 12 + (zoneMatch ? 15 : 0) - (clash ? 40 : 0);

        return {
          quickerId: q.id,
          name: q.name,
          zone: q.zone,
          rating: q.rating,
          hasSkill,
          load,
          zoneMatch,
          clash,
          score: Math.round(score * 100) / 100,
        };
      }),
    );

    return candidates.sort((a, b) => b.score - a.score);
  }

  /** Asigna (o reasigna) un quicker a la reserva. Auditado con candidatos vs elegido. */
  async assign(bookingId: string, quickerId: string, actorId: string, reason?: string) {
    const quicker = await this.prisma.quicker.findUnique({ where: { id: quickerId } });
    if (!quicker) {
      throw new NotFoundException("Quicker no encontrado");
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException("Reserva no encontrada");
    }
    if (booking.status === "completado" || booking.status === "cancelado") {
      throw new BadRequestException("No se puede asignar una reserva finalizada");
    }

    const candidates = await this.rankCandidates(bookingId);
    const previousQuickerId = booking.quickerId;

    const assignment = await this.prisma.$transaction(async (tx) => {
      const a = await tx.serviceAssignment.upsert({
        where: { bookingId },
        update: { quickerId, assignedById: actorId, reason, assignedAt: new Date() },
        create: { bookingId, quickerId, assignedById: actorId, reason },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { quickerId: quicker.userId } });
      return a;
    });

    await this.audit.record({
      action: "assignment.create",
      outcome: "success",
      actorId,
      resourceType: "booking",
      resourceId: bookingId,
      before: previousQuickerId ? { quickerUserId: previousQuickerId } : null,
      after: { quickerId, quickerName: quicker.name, reason: reason ?? null },
      metadata: {
        chosen: quickerId,
        candidates: candidates.map((c) => ({ quickerId: c.quickerId, score: c.score })),
      },
    });

    return assignment;
  }

  /** Tablero: reservas activas con su asignación (las sin asignar resaltadas). */
  async board() {
    return this.prisma.booking.findMany({
      where: { status: { in: ["agendado", "en_curso"] } },
      orderBy: { scheduledAt: "asc" },
      include: {
        category: { select: { name: true } },
        client: { select: { email: true } },
        assignment: { include: { quicker: { select: { name: true, zone: true } } } },
      },
    });
  }
}
